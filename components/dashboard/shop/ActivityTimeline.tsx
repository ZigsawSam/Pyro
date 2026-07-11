"use client"

import { useEffect, useState } from "react"
import { ShoppingBag, CheckCircle, UserPlus, Banknote, Clock } from "lucide-react"
import { createShopClient } from "@/lib/supabase/shop-client"

interface ActivityTimelineProps {
  shopId: number
}

export function ActivityTimeline({ shopId }: ActivityTimelineProps) {
  const supabase = createShopClient()
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const { data: sales } = await supabase
        .from("sales")
        .select("id, amount, sale_date, agents:agent_id (name)")
        .eq("shop_id", shopId)
        .order("sale_date", { ascending: false })
        .limit(5)

      const { data: payouts } = await supabase
        .from("payouts")
        .select("id, amount_paid, status, created_at")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false })
        .limit(3)

      const combined = [
        ...(sales || []).map((s: any) => ({
          id: `sale-${s.id}`,
          type: "sale",
          title: `Sale of ₹${s.amount?.toLocaleString("en-IN")}`,
          subtitle: s.agents?.name ? `by ${s.agents.name}` : "Direct sale",
          time: s.sale_date,
          icon: ShoppingBag,
          color: "bg-blue-100 text-blue-600",
        })),
        ...(payouts || []).map((p: any) => ({
          id: `payout-${p.id}`,
          type: "payout",
          title: `Payout ${p.status}`,
          subtitle: `₹${p.amount_paid?.toLocaleString("en-IN")}`,
          time: p.created_at,
          icon: p.status === "paid" ? CheckCircle : Banknote,
          color: p.status === "paid" ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600",
        })),
      ]
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        .slice(0, 6)

      setActivities(combined)
      setLoading(false)
    }

    fetchData()
  }, [shopId, supabase])

  if (loading) {
    return <div className="bg-white rounded-2xl p-6 border border-slate-100 h-80 animate-pulse" />
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h3>

      {activities.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm">No recent activity</div>
      ) : (
        <div className="space-y-0">
          {activities.map((a, i) => (
            <div key={a.id} className="flex gap-4 relative">
              {i < activities.length - 1 && (
                <div className="absolute left-4 top-10 bottom-0 w-px bg-slate-100" />
              )}
              <div className={`w-8 h-8 rounded-full ${a.color} flex items-center justify-center shrink-0 mt-0.5`}>
                <a.icon size={14} />
              </div>
              <div className="pb-5">
                <p className="text-sm font-medium text-slate-900">{a.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{a.subtitle}</p>
                <p className="text-xs text-slate-300 mt-1">
                  {new Date(a.time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  {" · "}
                  {new Date(a.time).toLocaleDateString("en-US", { day: "numeric", month: "short" })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
