"use client"

import { useEffect, useState } from "react"
import { TrendingUp, TrendingDown, Store, Wallet, Clock, ShoppingBag } from "lucide-react"
import { createAgentClient } from "@/lib/supabase/agent-client"

interface StatsData {
  totalCommission: number
  commissionChange: number
  linkedShops: number
  newShops: number
  pendingCommission: number
  totalSales: number
  salesChange: number
}

export function AgentDashboardStats({ agentId }: { agentId: number }) {
  const supabase = createAgentClient()
  const [stats, setStats] = useState<StatsData>({
    totalCommission: 0, commissionChange: 0, linkedShops: 0, newShops: 0,
    pendingCommission: 0, totalSales: 0, salesChange: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      const today = new Date()
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
      const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString()
      const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0).toISOString()

      const [
        { data: currentSales },
        { data: lastMonthSales },
        { data: shops },
        { data: newShops },
        { data: payouts },
      ] = await Promise.all([
        supabase.from("sales").select("amount, commission_amount").eq("agent_id", agentId).gte("sale_date", startOfMonth),
        supabase.from("sales").select("amount, commission_amount").eq("agent_id", agentId).gte("sale_date", startOfLastMonth).lt("sale_date", endOfLastMonth),
        supabase.from("shop_agents").select("id").eq("agent_id", agentId).eq("status", "active"),
        supabase.from("shop_agents").select("id").eq("agent_id", agentId).eq("status", "active").gte("joined_at", startOfMonth),
        supabase.from("payouts").select("amount_paid, status").eq("agent_id", agentId),
      ])

      const currentTotal = (currentSales || []).reduce((s: number, r: any) => s + (r.commission_amount || 0), 0)
      const lastMonthTotal = (lastMonthSales || []).reduce((s: number, r: any) => s + (r.commission_amount || 0), 0)
      const currentSalesTotal = (currentSales || []).reduce((s: number, r: any) => s + (r.amount || 0), 0)
      const lastMonthSalesTotal = (lastMonthSales || []).reduce((s: number, r: any) => s + (r.amount || 0), 0)

      const commissionChange = lastMonthTotal > 0 ? ((currentTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0
      const salesChange = lastMonthSalesTotal > 0 ? ((currentSalesTotal - lastMonthSalesTotal) / lastMonthSalesTotal) * 100 : 0

      const pendingTotal = (payouts || [])
        .filter((p: any) => p.status === "pending")
        .reduce((s: number, r: any) => s + (r.amount_paid || 0), 0)

      setStats({
        totalCommission: currentTotal,
        commissionChange: Math.round(commissionChange * 10) / 10,
        linkedShops: shops?.length || 0,
        newShops: newShops?.length || 0,
        pendingCommission: pendingTotal,
        totalSales: currentSalesTotal,
        salesChange: Math.round(salesChange * 10) / 10,
      })
      setLoading(false)
    }

    fetchStats()
  }, [agentId, supabase])

  const cards = [
    { label: "Total Commission", value: stats.totalCommission, change: stats.commissionChange, icon: Wallet, color: "blue" },
    { label: "Linked Shops", value: stats.linkedShops, sub: `${stats.newShops} new this month`, icon: Store, color: "emerald" },
    { label: "Pending Commission", value: stats.pendingCommission, icon: Clock, color: "amber" },
    { label: "Total Sales", value: stats.totalSales, change: stats.salesChange, icon: ShoppingBag, color: "violet" },
  ]

  const colorMap: Record<string, { bg: string; text: string; iconBg: string }> = {
    blue: { bg: "bg-blue-50", text: "text-blue-600", iconBg: "bg-blue-100" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600", iconBg: "bg-emerald-100" },
    amber: { bg: "bg-amber-50", text: "text-amber-600", iconBg: "bg-amber-100" },
    violet: { bg: "bg-violet-50", text: "text-violet-600", iconBg: "bg-violet-100" },
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 h-28 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const colors = colorMap[card.color]
        return (
          <div key={card.label} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{card.label}</span>
              <div className={`w-8 h-8 rounded-lg ${colors.iconBg} flex items-center justify-center`}>
                <card.icon size={16} className={colors.text} />
              </div>
            </div>
            <p className="text-xl font-bold text-slate-900">₹{card.value.toLocaleString("en-IN")}</p>
            {card.change !== undefined && (
              <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${card.change >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {card.change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {Math.abs(card.change)}% vs last month
              </div>
            )}
            {card.sub && (
              <p className="text-xs text-emerald-600 mt-1 font-medium">{card.sub}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
