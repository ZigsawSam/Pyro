"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, User, LogOut, Settings, CheckCircle, XCircle, Clock, Sparkles, Check } from "lucide-react"
import { createShopClient } from "@/lib/supabase/shop-client"

interface HeaderProps {
  title: string
  subtitle?: string
  shopName?: string
  shopId?: number
  isAgent?: boolean
}

interface Notification {
  id: number
  type: "agent_request" | "app_update"
  title: string
  message: string
  date: string
  read: boolean
  data?: any
}

export function Header({ title, subtitle, shopName, shopId, isAgent = false }: HeaderProps) {
  const router = useRouter()
  const supabase = createShopClient()
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<"shop" | "agent">("shop")
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [loading, setLoading] = useState(false)
  const [processingId, setProcessingId] = useState<number | null>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false)
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfile(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Fetch user + notifications
  useEffect(() => {
    const init = async () => {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) return
      setUser(u)

      // Detect role from email
      const isAgentUser = u.email?.endsWith("@agent.local")
      setUserRole(isAgentUser ? "agent" : "shop")

      await fetchNotifications(u, isAgentUser)
    }
    init()
  }, [shopId])

  const fetchNotifications = async (u: any, isAgentUser: boolean) => {
    setLoading(true)
    const notifs: Notification[] = []

    try {
      if (!isAgentUser && shopId) {
        // Shop owner: fetch pending agent requests
        const [{ data: receivedReqs }, { data: sentReqs }] = await Promise.all([
          supabase
            .from("agent_requests")
            .select("id, commission_rate, message, requested_by, status, requested_at")
            .eq("shop_id", shopId)
            .eq("status", "pending"),
          supabase
            .from("agent_link_requests")
            .select("id, commission_rate, message, requested_by, status, requested_at, agent_id")
            .eq("shop_id", shopId)
            .eq("status", "pending"),
        ])

        ;(receivedReqs || []).forEach((req: any) => {
          notifs.push({
            id: req.id + 10000,
            type: "agent_request",
            title: "Agent Invitation Received",
            message: `Commission rate: ${req.commission_rate}%${req.message ? ` — "${req.message}"` : ""}`,
            date: req.requested_at,
            read: false,
            data: { ...req, _source: "agent_requests" },
          })
        })

        ;(sentReqs || []).forEach((req: any) => {
          notifs.push({
            id: req.id + 20000,
            type: "agent_request",
            title: "Agent Requested to Join",
            message: `Commission rate: ${req.commission_rate}%${req.message ? ` — "${req.message}"` : ""}`,
            date: req.requested_at,
            read: false,
            data: { ...req, _source: "agent_link_requests" },
          })
        })
      }

      // Hardcoded app updates
      notifs.push({
        id: 99901,
        type: "app_update",
        title: "New Feature: Attendance Logging",
        message: "You can now log daily attendance for all staff members.",
        date: new Date().toISOString(),
        read: false,
      })
      notifs.push({
        id: 99902,
        type: "app_update",
        title: "Payroll Auto-Calculation",
        message: "Staff salary is now calculated automatically from attendance records.",
        date: new Date(Date.now() - 86400000).toISOString(),
        read: true,
      })

      setNotifications(notifs)
      setUnreadCount(notifs.filter(n => !n.read).length)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptRequest = async (notif: Notification) => {
    if (!notif.data) return
    setProcessingId(notif.id)
    try {
      const table = notif.data._source
      const { error } = await supabase
        .from(table)
        .update({ status: "approved" })
        .eq("id", notif.data.id)

      if (error) throw error

      // Create shop_agents link
      const { error: linkError } = await supabase.from("shop_agents").insert({
        shop_id: shopId,
        agent_id: notif.data.agent_id,
        commission_rate: notif.data.commission_rate,
      })

      if (linkError) throw linkError

      // Mark as read
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (e) {
      console.error(e)
      alert("Failed to accept request")
    } finally {
      setProcessingId(null)
    }
  }

  const handleRejectRequest = async (notif: Notification) => {
    if (!notif.data) return
    setProcessingId(notif.id)
    try {
      const table = notif.data._source
      const { error } = await supabase
        .from(table)
        .update({ status: "rejected" })
        .eq("id", notif.data.id)

      if (error) throw error

      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (e) {
      console.error(e)
      alert("Failed to reject request")
    } finally {
      setProcessingId(null)
    }
  }

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  const dismissNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  return (
    <header className="bg-card border-b border-border animate-fade-in">
      <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
          {shopName && <p className="text-xs text-muted-foreground mt-1 font-medium">{shopName}</p>}
        </div>

        <div className="flex items-center gap-2">
          {/* Notification Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false) }}
              className="relative p-2.5 rounded-xl hover:bg-secondary/80 transition-all duration-200 btn-press focus-ring-animate"
              aria-label="Notifications"
            >
              <Bell
                size={20}
                className={`text-foreground transition-transform duration-300 ${unreadCount > 0 ? "animate-bell-shake" : ""}`}
              />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-destructive rounded-full animate-pulse-ring" />
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-card border border-border rounded-xl shadow-xl z-50 animate-scale-in overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <h3 className="font-semibold text-sm">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                    >
                      <Check size={12} /> Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {loading ? (
                    <div className="p-4 space-y-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-12 rounded-lg animate-shimmer" />
                      ))}
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Bell size={32} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No notifications</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/50">
                      {notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`p-4 hover:bg-secondary/30 transition-colors animate-slide-in-right ${
                            !notif.read ? "bg-primary/5" : ""
                          }`}
                          style={{ animationDelay: `${notifications.indexOf(notif) * 50}ms` }}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 p-1.5 rounded-lg ${
                              notif.type === "agent_request"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-blue-100 text-blue-700"
                            }`}>
                              {notif.type === "agent_request" ? (
                                <Sparkles size={14} />
                              ) : (
                                <Clock size={14} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{notif.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                              <p className="text-xs text-muted-foreground/60 mt-1">
                                {new Date(notif.date).toLocaleDateString()}
                              </p>

                              {/* Action buttons for agent requests */}
                              {notif.type === "agent_request" && notif.data && !notif.read && (
                                <div className="flex gap-2 mt-2">
                                  <button
                                    onClick={() => handleAcceptRequest(notif)}
                                    disabled={processingId === notif.id}
                                    className="flex items-center gap-1 px-2.5 py-1 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                                  >
                                    {processingId === notif.id ? (
                                      <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                      <CheckCircle size={12} />
                                    )}
                                    Accept
                                  </button>
                                  <button
                                    onClick={() => handleRejectRequest(notif)}
                                    disabled={processingId === notif.id}
                                    className="flex items-center gap-1 px-2.5 py-1 text-xs bg-destructive/10 text-destructive rounded-md hover:bg-destructive/20 transition-colors disabled:opacity-50"
                                  >
                                    <XCircle size={12} />
                                    Reject
                                  </button>
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => dismissNotification(notif.id)}
                              className="text-muted-foreground/40 hover:text-muted-foreground transition-colors p-0.5"
                            >
                              <XCircle size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => { setShowProfile(!showProfile); setShowNotifications(false) }}
              className="flex items-center gap-2 p-2 pl-3 pr-2 rounded-xl hover:bg-secondary/80 transition-all duration-200 btn-press focus-ring-animate"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User size={16} className="text-primary" />
              </div>
              <span className="hidden sm:block text-sm font-medium truncate max-w-[120px]">
                {user?.email?.split("@")[0] || "User"}
              </span>
            </button>

            {/* Profile Dropdown */}
            {showProfile && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-card border border-border rounded-xl shadow-xl z-50 animate-scale-in overflow-hidden">
                <div className="p-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User size={20} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{user?.email?.split("@")[0] || "User"}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email || ""}</p>
                      <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 text-[10px] bg-secondary rounded-full text-secondary-foreground capitalize">
                        {userRole}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-2">
                  <button
                    onClick={() => { setShowProfile(false); router.push("/settings") }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-secondary/50 transition-colors text-left"
                  >
                    <Settings size={16} className="text-muted-foreground" />
                    Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-destructive/10 transition-colors text-left text-destructive"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
