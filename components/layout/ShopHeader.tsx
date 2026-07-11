"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Bell,
  ChevronDown,
  LogOut,
  Settings,
  User,
  CheckCircle,
  Clock,
  XCircle,
  Store,
  Wallet,
  Briefcase,
  X,
  UserCircle,
} from "lucide-react"
import { createShopClient } from "@/lib/supabase/shop-client"

interface ShopHeaderProps {
  title: string
  subtitle?: string
  shopName?: string
  shopId?: number
}

interface Notification {
  id: string
  type: "request" | "approval" | "payment" | "update"
  title: string
  message: string
  date: string
  read: boolean
  requestId?: number
}

export function ShopHeader({ title, subtitle, shopName, shopId }: ShopHeaderProps) {
  const router = useRouter()
  const supabase = createShopClient()
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [userData, setUserData] = useState<{ name: string; email: string } | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const notifRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserData({
          name: shopName || user.user_metadata?.name || user.email?.split("@")[0] || "Owner",
          email: user.email || "",
        })
      }
    }
    fetchUser()
  }, [supabase, shopName])

  // Fetch shop notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!shopId) return

      const [{ data: agentRequests }, { data: linkRequests }] = await Promise.all([
        supabase
          .from("agent_requests")
          .select("id, agent_name, status, created_at")
          .eq("shop_id", shopId)
          .eq("status", "pending"),
        supabase
          .from("agent_link_requests")
          .select("id, agent_name, status, created_at")
          .eq("shop_id", shopId)
          .eq("status", "pending"),
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

      setNotifications(requestNotifications)
      setUnreadCount(requestNotifications.filter((n) => !n.read).length)
    }

    fetchNotifications()
  }, [shopId, supabase])

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

  const getIcon = (type: string) => {
    switch (type) {
      case "request":
        return { icon: Briefcase, color: "text-blue-500", bg: "bg-blue-50" }
      case "approval":
        return { icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-50" }
      case "payment":
        return { icon: Wallet, color: "text-green-500", bg: "bg-green-50" }
      default:
        return { icon: Clock, color: "text-amber-500", bg: "bg-amber-50" }
    }
  }

  const displayName = shopName || userData?.name || "Shop Owner"
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left: Title + Welcome */}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          {subtitle ? (
            <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
          ) : (
            <p className="text-sm text-slate-500 mt-0.5">
              Welcome back, {displayName}! 👋
            </p>
          )}
        </div>

        {/* Right: Notifications + Date + User */}
        <div className="flex items-center gap-4 ml-4">
          {/* Notification Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                setShowNotifications(!showNotifications)
                setShowProfile(false)
              }}
              className="relative p-2.5 rounded-xl hover:bg-slate-100 transition-all duration-200"
              aria-label="Notifications"
            >
              <Bell size={20} className="text-slate-600" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-blue-500 rounded-full" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-2xl z-[9999]">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <h3 className="font-semibold text-sm">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <CheckCircle size={12} /> Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-slate-400">
                      <Clock size={24} className="mx-auto mb-2 text-slate-300" />
                      No notifications
                    </div>
                  ) : (
                    notifications.map((n) => {
                      const { icon: Icon, color, bg } = getIcon(n.type)
                      return (
                        <div
                          key={n.id}
                          className={`px-4 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors ${
                            !n.read ? "bg-blue-50/50" : ""
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 p-1.5 rounded-lg ${bg} ${color}`}>
                              <Icon size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{n.title}</p>
                              <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                              <p className="text-xs text-slate-400 mt-1">{n.date}</p>
                              {n.type === "request" && n.requestId && (
                                <div className="flex gap-2 mt-2">
                                  <button
                                    onClick={() => handleAcceptRequest(n.requestId!, "agent_requests")}
                                    className="text-xs px-2 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                                  >
                                    Accept
                                  </button>
                                  <button
                                    onClick={() => handleRejectRequest(n.requestId!, "agent_requests")}
                                    className="text-xs px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                                  >
                                    Reject
                                  </button>
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => dismissNotification(n.id)}
                              className="text-slate-300 hover:text-slate-500 transition-colors p-0.5"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      )
                    })
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
              className="flex items-center gap-3 hover:bg-slate-50 rounded-xl p-1.5 pr-3 transition-all duration-200"
              aria-label="Profile menu"
            >
              <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-semibold text-sm">
                {initials}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-sm font-semibold text-slate-900">{displayName}</p>
                <p className="text-xs text-slate-500">Shop Owner</p>
              </div>
              <ChevronDown size={14} className="text-slate-400 hidden lg:block" />
            </button>

            {showProfile && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-2xl z-[9999]">
                <div className="px-4 py-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{displayName}</p>
                      <p className="text-xs text-slate-500 truncate">{userData?.email || ""}</p>
                      <span className="inline-flex items-center gap-1 mt-1 text-xs px-2 py-0.5 bg-slate-100 rounded-full text-slate-600">
                        <UserCircle size={10} /> Shop Owner
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
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors text-left"
                  >
                    <Settings size={16} className="text-slate-400" /> Settings
                  </button>
                  <div className="border-t border-slate-100 mx-3 my-1" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-red-50 text-red-500 transition-colors text-left"
                  >
                    <LogOut size={16} /> Logout
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
