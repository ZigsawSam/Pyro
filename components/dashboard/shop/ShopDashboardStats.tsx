"use client"

import { useEffect, useState } from "react"
import { TrendingUp, TrendingDown, Users, Wallet, Clock, ShoppingBag, CreditCard, Banknote } from "lucide-react"
import { createShopClient } from "@/lib/supabase/shop-client"

interface StatsData {
  todaySales: number
  todayChange: number
  monthlyRevenue: number
  monthlyTarget: number
  activeAgents: number
  activeStaff: number
  pendingPayouts: number
  pendingPayroll: number
}

export function ShopDashboardStats({ shopId }: { shopId: number }) {
  const supabase = createShopClient()
  const [stats, setStats] = useState<StatsData>({
    todaySales: 0, todayChange: 0, monthlyRevenue: 0, monthlyTarget: 1000000,
    activeAgents: 0, activeStaff: 0, pendingPayouts: 0, pendingPayroll: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      const today = new Date().toISOString().split("T")[0]
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0]

      const [
        { data: todaySales },
        { data: yesterdaySales },
        { data: monthlySales },
        { data: agents },
        { data: staff },
        { data: payouts },
        { data: payroll },
      ] = await Promise.all([
        supabase.from("sales").select("amount").eq("shop_id", shopId).gte("sale_date", today),
        supabase.from("sales").select("amount").eq("shop_id", shopId).gte("sale_date", yesterday).lt("sale_date", today),
        supabase.from("sales").select("amount").eq("shop_id", shopId).gte("sale_date", startOfMonth),
        supabase.from("shop_agents").select("id").eq("shop_id", shopId).eq("status", "active"),
        supabase.from("staff").select("id").eq("shop_id", shopId).eq("status", "active"),
        supabase.from("payouts").select("amount_paid").eq("shop_id", shopId).eq("status", "pending"),
        supabase.from("payroll").select("amount").eq("shop_id", shopId).eq("status", "pending"),
      ])

      const todayTotal = (todaySales || []).reduce((s: number, r: any) => s + (r.amount || 0), 0)
      const yesterdayTotal = (yesterdaySales || []).reduce((s: number, r: any) => s + (r.amount || 0), 0)
      const monthlyTotal = (monthlySales || []).reduce((s: number, r: any) => s + (r.amount || 0), 0)
      const pendingPayoutTotal = (payouts || []).reduce((s: number, r: any) => s + (r.amount_paid || 0), 0)
      const pendingPayrollTotal = (payroll || []).reduce((s: number, r: any) => s + (r.amount || 0), 0)

      const change = yesterdayTotal > 0 ? ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100 : 0

      setStats({
        todaySales: todayTotal,
        todayChange: Math.round(change * 10) / 10,
        monthlyRevenue: monthlyTotal,
        monthlyTarget: 1000000,
        activeAgents: agents?.length || 0,
        activeStaff: staff?.length || 0,
        pendingPayouts: pendingPayoutTotal,
        pendingPayroll: pendingPayrollTotal,
      })
      setLoading(false)
    }

    fetchStats()
  }, [shopId, supabase])

  const cards = [
    { label: "Today's Sales", value: stats.todaySales, change: stats.todayChange, icon: ShoppingBag, color: "blue" },
    { label: "Monthly Revenue", value: stats.monthlyRevenue, target: stats.monthlyTarget, icon: Wallet, color: "emerald" },
    { label: "Active Agents", value: stats.activeAgents, icon: Users, color: "violet" },
    { label: "Active Staff", value: stats.activeStaff, icon: Users, color: "amber" },
    { label: "Pending Payouts", value: stats.pendingPayouts, icon: Banknote, color: "orange" },
    { label: "Pending Payroll", value: stats.pendingPayroll, icon: CreditCard, color: "rose" },
  ]

  const colorMap: Record<string, { bg: string; text: string; iconBg: string }> = {
    blue: { bg: "bg-blue-50", text: "text-blue-600", iconBg: "bg-blue-100" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600", iconBg: "bg-emerald-100" },
    violet: { bg: "bg-violet-50", text: "text-violet-600", iconBg: "bg-violet-100" },
    amber: { bg: "bg-amber-50", text: "text-amber-600", iconBg: "bg-amber-100" },
    orange: { bg: "bg-orange-50", text: "text-orange-600", iconBg: "bg-orange-100" },
    rose: { bg: "bg-rose-50", text: "text-rose-600", iconBg: "bg-rose-100" },
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 h-28 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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
                {Math.abs(card.change)}% vs yesterday
              </div>
            )}
            {card.target !== undefined && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-400">{Math.round((card.value / card.target) * 100)}% of target</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${Math.min((card.value / card.target) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
