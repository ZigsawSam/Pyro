"use client"

import { useParams } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Loader2, Download } from "lucide-react"
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

      const [{ data: salesData }, { data: payoutsData }, { data: salaryData }] = await Promise.all([
        supabase.from("sales").select("amount, commission_amount, sale_date").eq("shop_id", shopId).gte("sale_date", from).lte("sale_date", to),
        supabase.from("payouts").select("amount_paid, person_type").eq("shop_id", shopId).gte("payment_date", from).lte("payment_date", to),
        supabase.from("salary").select("final_payable, status").eq("shop_id", shopId).eq("month", from.slice(0, 7)),
      ])

      const totalSales = (salesData || []).reduce((sum, s) => sum + Number(s.amount || 0), 0)
      const totalCommission = (salesData || []).reduce((sum, s) => sum + Number(s.commission_amount || 0), 0)
      const totalPayouts = (payoutsData || []).reduce((sum, p) => sum + Number(p.amount_paid || 0), 0)
      const agentPayouts = (payoutsData || []).filter((p) => p.person_type === "agent").reduce((sum, p) => sum + Number(p.amount_paid || 0), 0)
      const staffPayouts = (payoutsData || []).filter((p) => p.person_type === "staff").reduce((sum, p) => sum + Number(p.amount_paid || 0), 0)
      const advances = (payoutsData || []).filter((p) => false).reduce((sum, p) => sum + Number(p.amount_paid || 0), 0)
      const totalSalary = (salaryData || []).reduce((sum, s) => sum + Number(s.final_payable || 0), 0)
      const paidSalary = (salaryData || []).filter((s) => s.status === "paid").reduce((sum, s) => sum + Number(s.final_payable || 0), 0)

      setReportData({
        totalSales,
        totalCommission,
        totalPayouts,
        agentPayouts,
        staffPayouts,
        advances,
        totalSalary,
        paidSalary,
        pendingSalary: totalSalary - paidSalary,
        period: `${from} to ${to}`,
      })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <MainLayout title="Reports" shopId={shopId}>
      <Card className="p-4">
        <div className="flex gap-2 items-end flex-wrap">
          <div>
            <label className="block text-xs font-medium mb-1">From</label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">To</label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <Button onClick={generateReport} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Generate Report
          </Button>
        </div>
      </Card>

      {reportData && (
        <div className="grid gap-4 md:grid-cols-2 mt-6">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Total Sales</p>
            <p className="text-2xl font-bold">₹{reportData.totalSales.toLocaleString()}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Total Commission</p>
            <p className="text-2xl font-bold text-green-600">₹{reportData.totalCommission.toLocaleString()}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Total Payouts</p>
            <p className="text-2xl font-bold">₹{reportData.totalPayouts.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Agents: ₹{reportData.agentPayouts.toLocaleString()} | Staff: ₹{reportData.staffPayouts.toLocaleString()}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Advances</p>
            <p className="text-2xl font-bold text-amber-600">₹{reportData.advances.toLocaleString()}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Total Salary</p>
            <p className="text-2xl font-bold">₹{reportData.totalSalary.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Paid: ₹{reportData.paidSalary.toLocaleString()} | Pending: ₹{reportData.pendingSalary.toLocaleString()}</p>
          </Card>
        </div>
      )}
    </MainLayout>
  )
}