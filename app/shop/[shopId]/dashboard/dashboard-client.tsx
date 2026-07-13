"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Users, DollarSign, TrendingUp, Calendar, Bell, Plus, FileText, Wallet, UserPlus } from "lucide-react"
import { createShopClient } from "@/lib/supabase/shop-client"
import { MainLayout } from "@/components/layout/main-layout"

// New dashboard components
import { SalesTrendChart } from "@/components/dashboard/shop/SalesTrendChart"
import { RevenueBreakdown } from "@/components/dashboard/shop/RevenueBreakdown"
import { MonthlyTarget } from "@/components/dashboard/shop/MonthlyTarget"
import { RecentSales } from "@/components/dashboard/shop/RecentSales"
import { TopAgents } from "@/components/dashboard/shop/TopAgents"
import { PendingActions } from "@/components/dashboard/shop/PendingActions"
import { QuickActions } from "@/components/dashboard/shop/QuickActions"
import { ActivityTimeline } from "@/components/dashboard/shop/ActivityTimeline"

interface ShopDashboardPageProps {
  shopId: string
  user?: any
}

export function ShopDashboardPage({ shopId: shopIdProp, user }: ShopDashboardPageProps) {
  const supabase = createShopClient()

  // Convert prop string to number once
  const shopId = parseInt(shopIdProp, 10)

  const [loading, setLoading] = useState(true)
  const [shopName, setShopName] = useState("")

  const [stats, setStats] = useState({
    totalAgents: 0,
    totalStaff: 0,
    todaySales: 0,
    monthSales: 0,
    pendingPayouts: 0,
    pendingSalary: 0,
  })

  useEffect(() => {
    if (isNaN(shopId)) return
    fetchDashboardData()
  }, [shopId])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const { data: shop } = await supabase
        .from("shops")
        .select("shop_name")
        .eq("id", shopId)
        .single()
      if (shop) setShopName(shop.shop_name)

      const today = new Date().toISOString().split("T")[0]
      const monthStart = `${new Date().toISOString().slice(0, 7)}-01`

      const [
        { count: agentCount },
        { count: staffCount },
        { data: todaySalesData },
        { data: monthSalesData },
        { data: payoutsData },
        { data: staffData },
        { data: attendanceData },
        { data: staffPayoutsData }
      ] = await Promise.all([
        supabase.from("shop_agents").select("*", { count: "exact", head: true }).eq("shop_id", shopId),
        supabase.from("staff").select("*", { count: "exact", head: true }).eq("shop_id", shopId),
        supabase.from("sales").select("amount").eq("shop_id", shopId).eq("sale_date", today),
        supabase.from("sales").select("amount").eq("shop_id", shopId).gte("sale_date", monthStart),
        supabase.from("payouts").select("amount_paid").eq("shop_id", shopId).eq("person_type", "agent"),
        supabase.from("staff").select("id, base_salary, salary_type, overtime_rate").eq("shop_id", shopId).eq("is_active", true),
        supabase.from("attendance").select("staff_id, status, work_hours, overtime_hours").eq("shop_id", shopId).gte("attendance_date", monthStart),
        supabase.from("payouts").select("staff_id, amount_paid").eq("shop_id", shopId).eq("person_type", "staff").gte("payment_date", monthStart),
      ])

      const todaySales = (todaySalesData || []).reduce((sum, s) => sum + Number(s.amount || 0), 0)
      const monthSales = (monthSalesData || []).reduce((sum, s) => sum + Number(s.amount || 0), 0)
      const pendingPayouts = (payoutsData || []).reduce((sum, p) => sum + Number(p.amount_paid || 0), 0)

      // === EXACT STAFF SALARY CALCULATION (PRESERVED) ===
      let totalPendingSalary = 0
      const staffList = staffData || []
      const attendanceList = attendanceData || []
      const staffPayouts = staffPayoutsData || []

      staffList.forEach((staff: any) => {
        const staffAttendance = attendanceList.filter((a: any) => a.staff_id === staff.id)
        const presentDays = staffAttendance.filter((a: any) => a.status === "present").length
        const halfDays = staffAttendance.filter((a: any) => a.status === "half").length
        const totalOvertime = staffAttendance.reduce((sum: number, a: any) => sum + Number(a.overtime_hours || 0), 0)

        let salary = 0
        if (staff.salary_type === "monthly") {
          const dailyWage = (staff.base_salary || 0) / 30
          salary = (dailyWage * presentDays) + (dailyWage * 0.5 * halfDays) + ((staff.overtime_rate || 0) * totalOvertime)
        } else if (staff.salary_type === "daily") {
          salary = ((staff.base_salary || 0) * (presentDays + halfDays * 0.5)) + ((staff.overtime_rate || 0) * totalOvertime)
        } else if (staff.salary_type === "hourly") {
          const totalHours = staffAttendance.reduce((sum: number, a: any) => sum + Number(a.work_hours || 0), 0)
          salary = ((staff.base_salary || 0) * totalHours) + ((staff.overtime_rate || 0) * totalOvertime)
        }

        const totalPayouts = staffPayouts
          .filter((p: any) => p.staff_id === staff.id)
          .reduce((sum: number, p: any) => sum + Number(p.amount_paid || 0), 0)

        totalPendingSalary += Math.max(0, Math.round(salary - totalPayouts))
      })
      // ===========================================

      setStats({
        totalAgents: agentCount || 0,
        totalStaff: staffCount || 0,
        todaySales,
        monthSales,
        pendingPayouts,
        pendingSalary: totalPendingSalary,
      })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (isNaN(shopId)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (loading) {
    return (
      <MainLayout title="Dashboard" shopId={shopId} shopName={shopName} isAgent={false}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-[#2563EB]" />
        </div>
      </MainLayout>
    )
  }

  // --- Design System Constants ---
  const statCards = [
    {
      label: "Total Agents",
      value: stats.totalAgents,
      prefix: "",
      icon: Users,
      iconBg: "bg-[#EFF6FF]",
      iconColor: "text-[#2563EB]",
      trend: null,
      subtext: `${stats.totalAgents > 0 ? "Active partners" : "No agents yet"}`,
    },
    {
      label: "Total Staff",
      value: stats.totalStaff,
      prefix: "",
      icon: Users,
      iconBg: "bg-[#F5F3FF]",
      iconColor: "text-[#7C3AED]",
      trend: null,
      subtext: `${stats.totalStaff > 0 ? "All active" : "No staff yet"}`,
    },
    {
      label: "Today's Sales",
      value: stats.todaySales,
      prefix: "₹",
      icon: DollarSign,
      iconBg: "bg-[#EFF6FF]",
      iconColor: "text-[#2563EB]",
      trend: "+18%",
      subtext: "from yesterday",
    },
    {
      label: "This Month",
      value: stats.monthSales,
      prefix: "₹",
      icon: TrendingUp,
      iconBg: "bg-[#F0FDF4]",
      iconColor: "text-[#16A34A]",
      trend: "+12%",
      subtext: "vs last month",
    },
    {
      label: "Pending Payouts",
      value: stats.pendingPayouts,
      prefix: "₹",
      icon: DollarSign,
      iconBg: "bg-[#FEF3C7]",
      iconColor: "text-[#D97706]",
      trend: null,
      subtext: stats.pendingPayouts > 0 ? "Agents awaiting" : "All caught up",
      alert: stats.pendingPayouts > 0,
    },
    {
      label: "Pending Salary",
      value: stats.pendingSalary,
      prefix: "₹",
      icon: Calendar,
      iconBg: "bg-[#FDF2F8]",
      iconColor: "text-[#DB2777]",
      trend: null,
      subtext: stats.pendingSalary > 0 ? "Due by 15th" : "All paid",
      alert: stats.pendingSalary > 0,
    },
  ]

  return (
    <MainLayout title="Dashboard" shopId={shopId} shopName={shopName} isAgent={false}>
      <div className="max-w-[1440px] mx-auto space-y-6">

        {/* === HEADER SECTION === */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#0F172A] tracking-tight">
              Dashboard
            </h1>
            <p className="text-slate-500 mt-1 text-sm">
              Real-time overview of {shopName ? `'${shopName}'` : "your shop's"} financial health
            </p>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2 min-h-[44px]">
              <Calendar className="h-4 w-4" />
              {new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
            </button>
            <button className="px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2 min-h-[44px] active:scale-[0.98]">
              <Plus className="h-4 w-4" />
              Record Sale
            </button>
          </div>
        </div>

        {/* === MOBILE: HORIZONTAL SCROLL STAT CAROUSEL === */}
        <div className="md:hidden -mx-4 px-4 overflow-x-auto pb-2 snap-x snap-mandatory flex gap-3 scrollbar-hide">
          {statCards.slice(2, 5).map((card, i) => {
            const Icon = card.icon
            return (
              <div
                key={i}
                className="snap-center shrink-0 w-[280px] bg-white rounded-2xl p-5 border border-slate-100 shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {card.label}
                  </span>
                  <div className={`w-8 h-8 ${card.iconBg} rounded-lg flex items-center justify-center`}>
                    <Icon className={`h-4 w-4 ${card.iconColor}`} />
                  </div>
                </div>
                <div className="text-3xl font-bold text-[#0F172A] tabular-nums">
                  {card.prefix}
                  {card.value.toLocaleString("en-IN")}
                </div>
                {card.trend && (
                  <div className="flex items-center gap-1 mt-2 text-xs font-medium text-emerald-600">
                    <TrendingUp className="h-3 w-3" />
                    {card.trend} {card.subtext}
                  </div>
                )}
                {!card.trend && card.subtext && (
                  <div className={`mt-2 text-xs font-medium ${card.alert ? "text-amber-600" : "text-slate-500"}`}>
                    {card.subtext}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* === DESKTOP: BENTO GRID STATS (6 CARDS) === */}
        <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-4">
          {statCards.map((card, i) => {
            const Icon = card.icon
            return (
              <Card
                key={i}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group"
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2 pt-6 px-6">
                  <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {card.label}
                  </CardTitle>
                  <div
                    className={`w-10 h-10 ${card.iconBg} rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform`}
                  >
                    <Icon className={`h-5 w-5 ${card.iconColor}`} />
                  </div>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                  <div className="text-3xl font-bold text-[#0F172A] tabular-nums">
                    {card.prefix}
                    {card.value.toLocaleString("en-IN")}
                  </div>
                  {card.trend ? (
                    <div className="flex items-center gap-1.5 mt-2 text-sm font-medium text-emerald-600">
                      <TrendingUp className="h-3.5 w-3.5" />
                      {card.trend} {card.subtext}
                    </div>
                  ) : (
                    <div
                      className={`mt-2 text-sm ${card.alert ? "font-medium text-amber-600" : "text-slate-500"}`}
                    >
                      {card.subtext}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* === MAIN CONTENT GRID === */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SalesTrendChart shopId={shopId} />
          </div>
          <div className="space-y-6">
            <RevenueBreakdown shopId={shopId} />
            <MonthlyTarget shopId={shopId} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <RecentSales shopId={shopId} />
          <TopAgents shopId={shopId} />
          <PendingActions shopId={shopId} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
          <QuickActions shopId={shopId} />
          <ActivityTimeline shopId={shopId} />
        </div>
      </div>
    </MainLayout>
  )
}
