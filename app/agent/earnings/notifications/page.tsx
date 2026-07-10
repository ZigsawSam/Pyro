"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Bell, CheckCircle, Clock, XCircle, Store, ArrowLeft, Trash2 } from "lucide-react"
import { createAgentClient } from "@/lib/supabase/agent-client"
import { MainLayout } from "@/components/layout/main-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface Notification {
  id: number
  type: "request" | "approval" | "payment" | "update"
  title: string
  message: string
  created_at: string
  read: boolean
}

export default function NotificationsPage() {
  const router = useRouter()
  const supabase = createAgentClient()
  const [agentId, setAgentId] = useState<number | null>(null)
  const [agentName, setAgentName] = useState("")
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/auth/agent-login"); return }
      const { data: agent } = await supabase.from("agents").select("id, name").eq("user_id", user.id).single()
      if (!agent) { router.push("/auth/agent-login"); return }
      setAgentId(agent.id)
      setAgentName(agent.name)
      fetchData(agent.id)
    }
    checkAuth()
  }, [router, supabase])

  const fetchData = async (id: number) => {
    setLoading(true)
    try {
      // For now, build notifications from actual data
      const [requestsRes, payoutsRes] = await Promise.all([
        supabase.from("agent_requests").select("id, shop_id, status, requested_at, shops:shop_id (shop_name)").eq("agent_id", id),
        supabase.from("payouts").select("id, amount_paid, status, created_at").eq("agent_id", id),
      ])

      const notifs: Notification[] = []

      ;(requestsRes.data || []).forEach((req: any, i: number) => {
        if (req.status === "pending") {
          notifs.push({
            id: 100 + i,
            type: "request",
            title: "New Shop Request",
            message: `${req.shops?.shop_name || "A shop"} sent you a partnership request`,
            created_at: req.requested_at,
            read: false,
          })
        }
      })

      ;(payoutsRes.data || []).forEach((p: any, i: number) => {
        if (p.status === "paid") {
          notifs.push({
            id: 200 + i,
            type: "payment",
            title: "Payout Processed",
            message: `₹${Number(p.amount_paid || 0).toLocaleString()} has been paid to your account`,
            created_at: p.created_at,
            read: false,
          })
        }
      })

      notifs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setNotifications(notifs)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "request": return { icon: Store, color: "text-blue-500", bg: "bg-blue-50" }
      case "approval": return { icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-50" }
      case "payment": return { icon: Bell, color: "text-green-500", bg: "bg-green-50" }
      default: return { icon: Bell, color: "text-slate-500", bg: "bg-slate-50" }
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 60000)
    if (diff < 1) return "Just now"
    if (diff < 60) return `${diff} min ago`
    if (diff < 1440) return `${Math.floor(diff / 60)} hours ago`
    return date.toLocaleDateString("en-IN")
  }

  if (!agentId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <MainLayout title="Notifications" isAgent={true} userName={agentName} agentId={agentId}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <Button variant="outline" size="sm" onClick={() => router.push("/agent/dashboard")} className="mb-3 border-slate-200 gap-1.5">
              <ArrowLeft size={16} /> Back
            </Button>
            <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
            <p className="text-sm text-slate-500 mt-1">Stay updated on requests, approvals, and payments</p>
          </div>
          {notifications.length > 0 && (
            <Button variant="outline" size="sm" className="border-slate-200 gap-1.5 text-slate-500">
              <Trash2 size={14} /> Clear All
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin h-8 w-8 text-slate-400" />
          </div>
        ) : notifications.length === 0 ? (
          <Card className="p-12 text-center bg-white border-slate-100 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4">
              <Bell size={28} className="text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">No notifications</h3>
            <p className="text-sm text-slate-500">You are all caught up! Check back later for updates.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {notifications.map((notif) => {
              const { icon: Icon, color, bg } = getIcon(notif.type)
              return (
                <Card
                  key={notif.id}
                  className={`p-4 bg-white border-slate-100 shadow-sm hover:shadow-md transition-shadow ${
                    !notif.read ? "border-l-4 border-l-blue-500" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                      <Icon size={18} className={color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-slate-900">{notif.title}</p>
                        <span className="text-xs text-slate-400 shrink-0">{formatTime(notif.created_at)}</span>
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5">{notif.message}</p>
                    </div>
                    {!notif.read && (
                      <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-2" />
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </MainLayout>
  )
}