"use client"

import { useParams } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Loader2, Download, TrendingUp, Wallet, Clock, AlertCircle, PiggyBank, Users, Briefcase } from "lucide-react"
import { createShopClient } from "@/lib/supabase/shop-client"
import { MainLayout } from "@/components/layout/main-layout"

export default function ShopReportsPage() {
  const supabase = createShopClient()
  const params = useParams()
  const shopId = Number(params?.shopId)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [reportData, setReportData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const generateReport = async () => {
    setLoading(true)
    try {
      const from = dateFrom || new Date().toISOString().slice(0, 10)
      const to = dateTo || new Date().toISOString().slice(0, 10)

      const [
        { data: salesData },
        { data: payoutsData },
        { data: staffData },
        { data: attendanceData },
      ] = await Promise.all([
        supabase
          .from("sales")
          .select("amount, commission_amount, sale_date")
          .eq("shop_id", shopId)
          .gte("sale_date", from)
          .lte("sale_date", to),
        supabase
          .from("payouts")
          .select("amount_paid, person_type, staff_id")
          .eq("shop_id", shopId)
          .gte("payment_date", from)
          .lte("payment_date", to),
        supabase
          .from("staff")
          .select("id, base_salary, salary_type, overtime_rate")
          .eq("shop_id", shopId)
          .eq("is_active", true),
        supabase
          .from("attendance")
          .select("staff_id, status, work_hours, overtime_hours, attendance_date")
          .eq("shop_id", shopId)
          .gte("attendance_date", from)
          .lte("attendance_date", to),
      ])

      // ─── Sales & Commission ───
      const totalSales = (salesData || []).reduce((sum, s) => sum + Number(s.amount || 0), 0)
      const totalCommission = (salesData || []).reduce((sum, s) => sum + Number(s.commission_amount || 0), 0)

      // ─── Payouts Breakdown ───
      const agentPayouts = (payoutsData || [])
        .filter((p) => p.person_type === "agent")
        .reduce((sum, p) => sum + Number(p.amount_paid || 0), 0)

      const staffPayouts = (payoutsData || [])
        .filter((p) => p.person_type === "staff")
        .reduce((sum, p) => sum + Number(p.amount_paid || 0), 0)

      // ─── Commission Math ───
      const totalPaidCommissions = agentPayouts
      const pendingCommissions = Math.max(0, totalCommission - totalPaidCommissions)
      const advancesToAgents = Math.max(0, totalPaidCommissions - totalCommission)

      // ─── Salary Math (from attendance, same as staff page) ───
      const staffList = staffData || []
      const attendanceList = attendanceData || []
      let totalSalary = 0

      staffList.forEach((staff: any) => {
        const staffAttendance = attendanceList.filter((a: any) => a.staff_id === staff.id)
        const presentDays = staffAttendance.filter((a: any) => a.status === "present").length
        const halfDays = staffAttendance.filter((a: any) => a.status === "half_day").length
        const overtime = staffAttendance.reduce((sum: number, a: any) => sum + Number(a.overtime_hours || 0), 0)

        let dailyWage = 0
        if (staff.salary_type === "monthly") {
          dailyWage = Number(staff.base_salary || 0) / 30
        } else if (staff.salary_type === "weekly") {
          dailyWage = Number(staff.base_salary || 0) / 7
        } else {
          dailyWage = Number(staff.base_salary || 0)
        }

        const salary = (dailyWage * presentDays) + (dailyWage * 0.5 * halfDays) + (Number(staff.overtime_rate || 0) * overtime)
        totalSalary += salary
      })

      const totalPaidSalary = staffPayouts
      const pendingSalary = Math.max(0, totalSalary - totalPaidSalary)
      const advancesToStaff = Math.max(0, totalPaidSalary - totalSalary)

      setReportData({
        totalSales,
        totalCommission,
        totalPaidCommissions,
        pendingCommissions,
        advancesToAgents,
        totalSalary,
        totalPaidSalary,
        pendingSalary,
        advancesToStaff,
        period: `${from} to ${to}`,
      })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const cards = reportData
    ? [
        {
          label: "Total Sales",
          value: reportData.totalSales,
          icon: TrendingUp,
          color: "text-foreground",
          bg: "bg-card",
          sub: null,
        },
        {
          label: "Total Commission",
          value: reportData.totalCommission,
          icon: Wallet,
          color: "text-green-600",
          bg: "bg-green-50 dark:bg-green-950/20",
          sub: null,
        },
        {
          label: "Total Paid Commissions",
          value: reportData.totalPaidCommissions,
          icon: Briefcase,
          color: "text-blue-600",
          bg: "bg-blue-50 dark:bg-blue-950/20",
          sub: null,
        },
        {
          label: "Pending Commissions Left",
          value: reportData.pendingCommissions,
          icon: Clock,
          color: "text-amber-600",
          bg: "bg-amber-50 dark:bg-amber-950/20",
          sub: null,
        },
        {
          label: "Advances To Agents",
          value: reportData.advancesToAgents,
          icon: AlertCircle,
          color: "text-red-600",
          bg: "bg-red-50 dark:bg-red-950/20",
          sub: reportData.advancesToAgents > 0 ? "Overpaid beyond commission" : null,
        },
        {
          label: "Advances To Staff",
          value: reportData.advancesToStaff,
          icon: AlertCircle,
          color: "text-red-600",
          bg: "bg-red-50 dark:bg-red-950/20",
          sub: reportData.advancesToStaff > 0 ? "Overpaid beyond salary" : null,
        },
        {
          label: "Total Salary",
          value: reportData.totalSalary,
          icon: Users,
          color: "text-purple-600",
          bg: "bg-purple-50 dark:bg-purple-950/20",
          sub: null,
        },
        {
          label: "Pending Salary Left",
          value: reportData.pendingSalary,
          icon: PiggyBank,
          color: "text-orange-600",
          bg: "bg-orange-50 dark:bg-orange-950/20",
          sub: reportData.totalPaidSalary > 0 ? `Paid: ₹${reportData.totalPaidSalary.toLocaleString()}` : null,
        },
      ]
    : []

  return (
    <MainLayout title="Reports" shopId={shopId}>
      <Card className="p-4 card-hover">
        <div className="flex gap-3 items-end flex-wrap">
          <div>
            <label className="block text-xs font-medium mb-1 text-muted-foreground">From</label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-muted-foreground">To</label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
          </div>
          <Button onClick={generateReport} disabled={loading} className="btn-press">
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Generate Report
          </Button>
        </div>
      </Card>

      {reportData && (
        <>
          <p className="text-sm text-muted-foreground mt-6 mb-3 animate-fade-in">
            Period: <span className="font-medium text-foreground">{reportData.period}</span>
          </p>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mt-2 animate-fade-in">
            {cards.map((card, i) => (
              <Card
                key={card.label}
                className={`p-5 ${card.bg} border-0 shadow-sm hover:shadow-md transition-all duration-300 card-hover`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground font-medium">{card.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${card.color}`}>
                      ₹{card.value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    </p>
                    {card.sub && (
                      <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
                    )}
                  </div>
                  <div className={`p-2 rounded-lg ${card.bg} bg-opacity-50`}>
                    <card.icon size={20} className={card.color} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </MainLayout>
  )
}
