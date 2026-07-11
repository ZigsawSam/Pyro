"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, UserPlus, Banknote, Clock, Package } from "lucide-react"
import Link from "next/link"
import { createShopClient } from "@/lib/supabase/shop-client"

interface PendingActionsProps {
  shopId: number
}

export function PendingActions({ shopId }: PendingActionsProps) {
  const supabase = createShopClient()
  const [counts, setCounts] = useState({ agents: 0, payouts: 0, leave: 0, inventory: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const [
        { count: agentRequests },
        { count: payoutRequests },
        { count: leaveRequests },
      ] = await Promise.all([
        supabase.from("agent_requests").select("*", { count: "exact", head: true }).eq("shop_id", shopId).eq("status", "pending"),
        supabase.from("payouts").select("*", { count: "exact", head: true }).eq("shop_id", shopId).eq("status", "pending"),
        supabase.from("leave_requests").select("*", { count: "exact", head: true }).eq("shop_id", shopId).eq("status", "pending"),
      ])

      setCounts({
        agents: agentRequests || 0,
        payouts: payoutRequests || 0,
        leave: leaveRequests || 0,
        inventory: 0,
      })
      setLoading(false)
    }

    fetchData()
  }, [shopId, supabase])

  const actions = [
    { label: "Agent Requests", count: counts.agents, icon: UserPlus, href: `/shop/${shopId}/agents`, color: "blue" },
    { label: "Payout Requests", count: counts.payouts, icon: Banknote, href: `/shop/${shopId}/payouts`, color: "orange" },
    { label: "Staff Leave", count: counts.leave, icon: Clock, href: `/shop/${shopId}/staff`, color: "amber" },
    { label: "Low Stock", count: counts.inventory, icon: Package, href: `/shop/${shopId}/inventory`, color: "rose" },
  ]

  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    orange: "bg-orange-50 text-orange-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
  }

  if (loading) {
    return <div className="bg-white rounded-2xl p-6 border border-slate-100 h-80 animate-pulse" />
  }

  const totalActions = actions.reduce((s, a) => s + a.count, 0)

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Pending Actions</h3>
        {totalActions > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{totalActions}</span>
        )}
      </div>

      {totalActions === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-slate-400">
          <AlertTriangle size={32} className="mb-2 text-slate-300" />
          <p className="text-sm">All caught up!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {actions.filter(a => a.count > 0).map((a) => (
            <Link
              key={a.label}
              href={a.href}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
            >
              <div className={`w-10 h-10 rounded-lg ${colorMap[a.color]} flex items-center justify-center`}>
                <a.icon size={18} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">{a.count} {a.label}</p>
              </div>
              <span className="text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">View →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
