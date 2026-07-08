"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"  // ← ADD useParams
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Users, DollarSign, TrendingUp, Calendar } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { MainLayout } from "@/components/layout/main-layout"

// REMOVE params from props — use useParams() instead
export default function ShopDashboardPage() {
  const router = useRouter()
  const params = useParams()  // ← GET params from hook
  const supabase = createClient()
  const shopId = Number(params?.shopId)  // ← EXTRACT from params object
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalAgents: 0,
    totalStaff: 0,
    todaySales: 0,
    monthSales: 0,
    pendingPayouts: 0,
    pendingSalary: 0,
  })

  useEffect(() => {
    if (!shopId || isNaN(shopId)) return  // ← GUARD against invalid shopId
    fetchDashboardData()
  }, [shopId])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const today = new Date().toISOString().split("T")[0]
      const monthStart = `${new Date().toISOString().slice(0, 7)}-01`

      const [{ count: agentCount }, { count: staffCount }, { data: todaySalesData }, { data: monthSalesData }, { data: payoutsData }, { data: salaryData }] = await Promise.all([
        supabase.from("shop_agents").select("*", { count: "exact", head: true }).eq("shop_id", shopId),
        supabase.from("staff").select("*", { count: "exact", head: true }).eq("shop_id", shopId),
        supabase.from("sales").select("amount").eq("shop_id", shopId).eq("sale_date", today),
        supabase.from("sales").select("amount").eq("shop_id", shopId).gte("sale_date", monthStart),
        supabase.from("payouts").select("amount_paid").eq("shop_id", shopId).eq("is_advance", false),
        supabase.from("salary").select("final_payable").eq("shop_id", shopId).eq("status", "pending"),
      ])

      const todaySales = (todaySalesData || []).reduce((sum, s) => sum + Number(s.amount || 0), 0)
      const monthSales = (monthSalesData || []).reduce((sum, s) => sum + Number(s.amount || 0), 0)
      const pendingPayouts = (payoutsData || []).reduce((sum, p) => sum + Number(p.amount_paid || 0), 0)
      const pendingSalary = (salaryData || []).reduce((sum, s) => sum + Number(s.final_payable || 0), 0)

      setStats({
        totalAgents: agentCount || 0,
        totalStaff: staffCount || 0,
        todaySales,
        monthSales,
        pendingPayouts,
        pendingSalary,
      })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // Guard: if shopId is invalid, don't render MainLayout yet
  if (!shopId || isNaN(shopId)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (loading) {
    return (
      <MainLayout title="Dashboard" shopId={shopId}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout title="Dashboard" shopId={shopId}>
      {/* ... rest of your JSX stays exactly the same ... */}
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* ... all your Cards ... */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAgents}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalStaff}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats.todaySales.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats.monthSales.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats.pendingPayouts.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Salary</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats.pendingSalary.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}