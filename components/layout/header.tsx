"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Bell, User, LogOut, Settings, Check, X, Clock, Info, Briefcase, UserCircle } from "lucide-react"
import { createShopClient } from "@/lib/supabase/shop-client"

interface HeaderProps {
  title: string
  subtitle?: string
  shopName?: string
  shopId?: number
  isAgent?: boolean
}

interface Notification {
  id: string
  type: "request" | "update"
  title: string
  message: string
  date: string
  read: boolean
  requestId?: number
}

export function Header({ title, subtitle, shopName, shopId, isAgent = false }: HeaderProps) {
  const router = useRouter()
  const supabase = createShopClient()
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [userData, setUserData] = useState<{ name: string; email: string; role: string } | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const notifRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserData({
          name: user.user_metadata?.name || user.email?.split("@")[0] || "User",
          email: user.email || "",
          role: isAgent ? "Agent" : "Shop Owner",
        })
      }
    }
    fetchUser()
  }, [supabase, isAgent])

  // Fetch notifications (agent requests + hardcoded updates)
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!shopId || isAgent) {
        // For agents or no shop: only show app updates
        setNotifications([
          {
            id: "update-1",
            type: "update",
            title: "New Feature: Attendance Logging",
            message: "You can now log daily attendance for all staff members.",
            date: "7/10/2026",
            read: false,
          },
          {
            id: "update-2",
            type: "update",
            title: "Payroll Auto-Calculation",
            message: "Staff salary is now calculated automatically from attendance records.",
            date: "7/9/2026",
            read: false,
          },
        ])
        return
      }

      // Fetch pending agent requests for this shop
      const [{ data: agentRequests }, { data: linkRequests }] = await Promise.all([
        supabase.from("agent_requests").select("id, agent_name, status, created_at").eq("shop_id", shopId).eq("status", "pending"),
        supabase.from("agent_link_requests").select("id, agent_name, status, created_at").eq("shop_id", shopId).eq("status", "pending"),
      ])

      const requestNotifications: Notification[] = [
        ...(agentRequests || []).map((r: any) => ({
          id: `req-${r.id}`,
          type: "request" as const,
          title: "New Agent Request",
          message: `${r.agent_name || "An agent"} wants to join your shop.`,
          date: new Date(r.created_at).toLocaleDateString(),
          read: false,
          requestId: r.id,
        })),
        ...(linkRequests || []).map((r: any) => ({
          id: `link-${r.id}`,
          type: "request" as const,
          title: "New Agent Link Request",
          message: `${r.agent_name || "An agent"} wants to link with your shop.`,
          date: new Date(r.created_at).toLocaleDateString(),
          read: false,
          requestId: r.id,
        })),
      ]

      const appUpdates: Notification[] = [
        {
          id: "update-1",
          type: "update",
          title: "New Feature: Attendance Logging",
          message: "You can now log daily attendance for all staff members.",
          date: "7/10/2026",
          read: false,
        },
        {
          id: "update-2",
          type: "update",
          title: "Payroll Auto-Calculation",
          message: "Staff salary is now calculated automatically from attendance records.",
          date: "7/9/2026",
          read: false,
        },
      ]

      const all = [...requestNotifications, ...appUpdates]
      setNotifications(all)
      setUnreadCount(all.filter((n) => !n.read).length)
    }

    fetchNotifications()
  }, [shopId, isAgent, supabase])

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

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  const dismissNotification = (id: string) => {
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== id)
      setUnreadCount(updated.filter((n) => !n.read).length)
      return updated
    })
  }

  const handleAcceptRequest = async (requestId: number, table: string) => {
    await supabase.from(table).update({ status: "approved" }).eq("id", requestId)
    dismissNotification(`req-${requestId}`)
  }

  const handleRejectRequest = async (requestId: number, table: string) => {
    await supabase.from(table).update({ status: "rejected" }).eq("id", requestId)
    dismissNotification(`req-${requestId}`)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
          {shopName && <p className="text-xs text-muted-foreground mt-0.5 truncate">Shop: {shopName}</p>}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 ml-4">
          {/* Notification Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                setShowNotifications(!showNotifications)
                setShowProfile(false)
              }}
              className="relative p-2 rounded-xl hover:bg-secondary/80 transition-all duration-200 btn-press"
              aria-label="Notifications"
            >
              <Bell size={20} className="text-foreground" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-destructive rounded-full animate-pulse-ring" />
              )}
            </button>

            {/* Notification Dropdown - z-50 to float above everything */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-card border border-border rounded-xl shadow-2xl animate-scale-in z-[9999]">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <h3 className="font-semibold text-sm">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <Check size={12} /> Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                      <Info size={24} className="mx-auto mb-2 text-muted-foreground/50" />
                      No notifications
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`px-4 py-3 border-b border-border last:border-0 hover:bg-secondary/50 transition-colors ${
                          !n.read ? "bg-primary/5" : ""
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 p-1.5 rounded-lg ${n.type === "request" ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-600"}`}>
                            {n.type === "request" ? <Briefcase size={14} /> : <Clock size={14} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{n.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                            <p className="text-xs text-muted-foreground/60 mt-1">{n.date}</p>
                            {n.type === "request" && n.requestId && (
                              <div className="flex gap-2 mt-2">
                                <button
                                  onClick={() => handleAcceptRequest(n.requestId!, "agent_requests")}
                                  className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                                >
                                  Accept
                                </button>
                                <button
                                  onClick={() => handleRejectRequest(n.requestId!, "agent_requests")}
                                  className="text-xs px-2 py-1 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => dismissNotification(n.id)}
                            className="text-muted-foreground/50 hover:text-muted-foreground transition-colors p-0.5"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => {
                setShowProfile(!showProfile)
                setShowNotifications(false)
              }}
              className="flex items-center gap-2 p-1.5 pr-3 rounded-xl hover:bg-secondary/80 transition-all duration-200 btn-press"
              aria-label="Profile menu"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                {userData?.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <span className="text-sm font-medium hidden sm:inline">{userData?.name || "User"}</span>
            </button>

            {/* Profile Dropdown - z-50 to float above everything */}
            {showProfile && (
              <div className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-2xl animate-scale-in z-[9999]">
                <div className="px-4 py-3 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {userData?.name?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{userData?.name || "User"}</p>
                      <p className="text-xs text-muted-foreground truncate">{userData?.email || ""}</p>
                      <span className="inline-flex items-center gap-1 mt-1 text-xs px-2 py-0.5 bg-secondary rounded-full text-muted-foreground">
                        <UserCircle size={10} /> {userData?.role || "User"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowProfile(false)
                      router.push("/settings")
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-secondary/50 transition-colors text-left"
                  >
                    <Settings size={16} className="text-muted-foreground" />
                    Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-destructive/10 text-destructive transition-colors text-left"
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
