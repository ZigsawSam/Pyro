"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Users, DollarSign, TrendingUp, Calendar } from "lucide-react"
import { createShopClient } from "@/lib/supabase/shop-client"
import { MainLayout } from "@/components/layout/main-layout"

export default function ShopDashboardPage() {
  const router = useRouter()
  const params = useParams()
  const supabase = createShopClient()
  const shopId = Number(params?.shopId)
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
    if (!shopId || isNaN(shopId)) return
    fetchDashboardData()
  }, [shopId])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
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

      // Calculate staff pending salary same as staff page
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
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
              <CardTitle className="text-sm font-medium">Today&apos;s Sales</CardTitle>
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
