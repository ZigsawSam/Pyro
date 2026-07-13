"use client"

import { useState, useEffect, useMemo } from "react"
import { createShopClient } from "@/lib/supabase/shop-client"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CsvExportButton } from "@/components/reports/csv-export-button"
import { formatCurrency, formatDate } from "@/lib/csv-export"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import {
  Printer,
  FileText,
  TrendingUp,
  Users,
  ShoppingCart,
  Calendar,
  Sparkles,
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────
interface SalesRecord {
  id: number
  shop_id: number
  agent_id: number
  amount: number
  commission_amount: number
  sale_date: string
  notes: string | null
  commission_rate: number | null
  status: string
  invoice_number: string | null
  created_at: string
}

interface PayoutRecord {
  id: number
  shop_id: number
  agent_id: number | null
  staff_id: number | null
  person_type: string | null
  amount_paid: number
  payment_date: string
  remarks: string | null
  payment_method: string | null
  status: string | null
  receipt_number: string
  created_at: string
}

interface SalaryRecord {
  id: number
  staff_id: number
  shop_id: number
  month: string
  total_days: number | null
  present_days: number | null
  absent_days: number | null
  base_salary: number
  overtime_amount: number | null
  deductions: number | null
  advances: number | null
  final_payable: number
  status: string | null
  created_at: string
}

interface AgentRecord {
  id: number
  unique_id: string
  name: string
  phone_number: string
  account_name: string | null
  account_number: string | null
  bank_name: string | null
  ifsc_code: string | null
  upi_id: string | null
  is_active: boolean | null
  total_commission_this_month: number | null
  total_sales_this_month: number | null
  current_tier_id: number | null
  created_at: string
  updated_at: string
  shop_id: number | null
  user_id: string | null
  description: string | null
}

// ─── Component ───────────────────────────────────────────
export function ShopReportsPage({ shopId, user }: { shopId: string; user?: any }) {
  const supabase = createShopClient()
  const [activeTab, setActiveTab] = useState("sales")
  const [startDate, setStartDate] = useState("2026-06-01")
  const [endDate, setEndDate] = useState("2026-07-31")

  const [sales, setSales] = useState<SalesRecord[]>([])
  const [payouts, setPayouts] = useState<PayoutRecord[]>([])
  const [salary, setSalary] = useState<SalaryRecord[]>([])
  const [agents, setAgents] = useState<AgentRecord[]>([])
  const [loading, setLoading] = useState(true)

  const isShop = user?.role === "shop" || true
  const currencySymbol = "₹"

  // ─── Fetch Data from Supabase ──────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const shopIdNum = parseInt(shopId)

      const [salesRes, payoutsRes, salaryRes, agentsRes] = await Promise.all([
        supabase
          .from("sales")
          .select("*")
          .eq("shop_id", shopIdNum)
          .gte("sale_date", startDate)
          .lte("sale_date", endDate)
          .order("sale_date", { ascending: false }),
        supabase
          .from("payouts")
          .select("*")
          .eq("shop_id", shopIdNum)
          .gte("payment_date", startDate)
          .lte("payment_date", endDate),
        supabase
          .from("salary")
          .select("*")
          .eq("shop_id", shopIdNum)
          .gte("month", startDate.substring(0, 7) + "-01")
          .lte("month", endDate.substring(0, 7) + "-01"),
        supabase.from("agents").select("*").eq("shop_id", shopIdNum),
      ])

      if (salesRes.data) setSales(salesRes.data as SalesRecord[])
      if (payoutsRes.data) setPayouts(payoutsRes.data as PayoutRecord[])
      if (salaryRes.data) setSalary(salaryRes.data as SalaryRecord[])
      if (agentsRes.data) setAgents(agentsRes.data as AgentRecord[])

      setLoading(false)
    }

    fetchData()
  }, [supabase, shopId, startDate, endDate])

  // ─── Computed Totals ───────────────────────────────────
  const totalRevenue = useMemo(
    () => sales.filter((s) => s.status === "confirmed").reduce((sum, s) => sum + Number(s.amount), 0),
    [sales]
  )
  const totalCommission = useMemo(
    () => sales.filter((s) => s.status === "confirmed").reduce((sum, s) => sum + Number(s.commission_amount), 0),
    [sales]
  )
  const totalDisbursedPayouts = useMemo(
    () => payouts.filter((p) => p.status === "paid").reduce((sum, p) => sum + Number(p.amount_paid), 0),
    [payouts]
  )
  const totalPayrollCost = useMemo(
    () => payouts.filter((p) => p.person_type === "staff" && p.status === "paid").reduce((sum, p) => sum + Number(p.amount_paid), 0),
    [payouts]
  )
  const completedCount = useMemo(() => sales.filter((s) => s.status === "confirmed").length, [sales])
  const pendingCount = useMemo(() => sales.filter((s) => s.status === "pending").length, [sales])

  // ─── Chart Datasets ────────────────────────────────────
  const salesTrendData = useMemo(() => {
    const salesByDate: Record<string, number> = {}
    sales.forEach((s) => {
      if (s.status === "confirmed") {
        salesByDate[s.sale_date] = (salesByDate[s.sale_date] || 0) + Number(s.amount)
      }
    })
    return Object.keys(salesByDate)
      .sort()
      .map((d) => ({ date: d, "Sales Volume": salesByDate[d] }))
  }, [sales])

  const agentRevenue = useMemo(() => {
    const map: Record<string, { name: string; revenue: number; commission: number }> = {}
    sales.forEach((s) => {
      if (s.status === "confirmed") {
        const ag = agents.find((a) => a.id === s.agent_id)
        const name = ag?.name || "Unknown Agent"
        if (!map[s.agent_id]) map[s.agent_id] = { name, revenue: 0, commission: 0 }
        map[s.agent_id].revenue += Number(s.amount)
        map[s.agent_id].commission += Number(s.commission_amount)
      }
    })
    return Object.values(map).map((v) => ({
      name: v.name,
      "Sales Revenue": v.revenue,
      "Commission Paid": v.commission,
    }))
  }, [sales, agents])

  const monthlyExpenses = useMemo(() => {
  const months = new Set<string>()
  sales.forEach((s) => months.add(s.sale_date.substring(0, 7)))
  salary.forEach((s) => months.add(s.month.substring(0, 7)))
  return Array.from(months)
    .sort()
    .map((m) => {
      const [year, monthNum] = m.split("-")
      const label = new Date(Number(year), Number(monthNum) - 1, 1).toLocaleDateString("en-IN", {
        month: "short",
        year: "numeric",
      })
      return {
        month: label,
        rawMonth: m, // keep the YYYY-MM for filtering
        "Commission Costs": sales
          .filter((s) => s.sale_date.startsWith(m) && s.status === "confirmed")
          .reduce((sum, s) => sum + Number(s.commission_amount), 0),
        "Staff Payroll Costs": salary
          .filter((s) => s.month.startsWith(m) && s.status === "paid")
          .reduce((sum, s) => sum + Number(s.final_payable), 0),
      }
    })
}, [sales, salary])

  // ─── CSV Export ────────────────────────────────────────
  const getSalesCsvData = (): Record<string, string | number>[] => {
    return sales.map((s) => {
      const ag = agents.find((a) => a.id === s.agent_id)
      return {
        Date: formatDate(s.sale_date),
        "Invoice No": s.invoice_number || `INV-${s.id}`,
        Notes: s.notes || "",
        Agent: ag?.name || "Direct",
        Amount: formatCurrency(Number(s.amount)),
        "Commission Rate": s.commission_rate ? `${s.commission_rate}%` : "N/A",
        Commission: formatCurrency(Number(s.commission_amount)),
        Status: s.status.charAt(0).toUpperCase() + s.status.slice(1),
      }
    })
  }

  const getAgentCsvData = (): Record<string, string | number>[] => {
    return Object.values(
      sales.reduce((acc, s) => {
        if (s.status !== "confirmed") return acc
        const ag = agents.find((a) => a.id === s.agent_id)
        const name = ag?.name || "Unknown"
        if (!acc[name]) acc[name] = { name, totalSales: 0, totalCommission: 0, transactions: 0 }
        acc[name].totalSales += Number(s.amount)
        acc[name].totalCommission += Number(s.commission_amount)
        acc[name].transactions += 1
        return acc
      }, {} as Record<string, any>)
    ).map((a: any) => ({
      "Agent Name": a.name,
      "Total Sales": formatCurrency(a.totalSales),
      "Total Commission": formatCurrency(a.totalCommission),
      Transactions: a.transactions,
      "Avg Commission Rate": `${a.totalSales > 0 ? ((a.totalCommission / a.totalSales) * 100).toFixed(1) : "0.0"}%`,
    }))
  }

  const getMonthlyCsvData = (): Record<string, string | number>[] => {
    return monthlyExpenses.map((m) => {
      const monthKey = m.rawMonth
      const salesInMonth = sales.filter((s) => s.sale_date.startsWith(monthKey) && s.status === "confirmed")
      const agentsInMonth = new Set(salesInMonth.map((s) => s.agent_id)).size
      const totalSalesMonth = salesInMonth.reduce((sum, s) => sum + Number(s.amount), 0)
      const totalCommMonth = salesInMonth.reduce((sum, s) => sum + Number(s.commission_amount), 0)
      return {
        Month: m.month,
        "Total Sales": formatCurrency(totalSalesMonth),
        "Total Commission": formatCurrency(totalCommMonth),
        Transactions: salesInMonth.length,
        "Active Agents": agentsInMonth,
      }
    })
  }

  const csvData =
    activeTab === "sales"
      ? getSalesCsvData()
      : activeTab === "agents"
      ? getAgentCsvData()
      : getMonthlyCsvData()

  const csvFilename = `shop-reports-${activeTab}-${new Date().toISOString().split("T")[0]}`

  // ─── Print ─────────────────────────────────────────────
  const handlePrint = () => {
    window.print()
  }

  // ─── Loading State ─────────────────────────────────────
  if (loading) {
    return (
      <MainLayout title="Reports & Analytics">
        <div className="flex items-center justify-center h-96">
          <div className="animate-pulse text-slate-500 font-mono text-sm">Loading analytics data...</div>
        </div>
      </MainLayout>
    )
  }

  // ─── Render ────────────────────────────────────────────
  return (
    <MainLayout
  title="Reports & Analytics"
  shopId={parseInt(shopId)}
  shopName={user?.shop_name || user?.name || ""}
  userName={user?.name || user?.email || ""}
>
      <div className="space-y-6">
        {/* ═══ Header ═══ */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white">Reports & Analytics</h2>
            <p className="text-slate-400 text-sm">Generate, export, and analyze your business performance data.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-2 rounded-xl">
              <span className="text-xs text-slate-500 font-medium font-mono">Date:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-950 text-xs text-slate-200 border border-slate-800 rounded px-2 outline-none w-28"
              />
              <span className="text-xs text-slate-600">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-950 text-xs text-slate-200 border border-slate-800 rounded px-2 outline-none w-28"
              />
            </div>

            <CsvExportButton data={csvData} filename={csvFilename} />
            <Button variant="outline" size="sm" onClick={handlePrint} className="border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>
        </div>

        {/* ═══ Summary Cards ═══ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-slate-900 border-slate-800/80">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[10px] font-mono tracking-wider text-slate-500 uppercase">Gross Sales Revenue</CardTitle>
              <ShoppingCart className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{currencySymbol}{totalRevenue.toLocaleString("en-IN")}</div>
              <p className="text-[10px] text-slate-400 mt-1 font-mono">{sales.length} confirmed sales logged</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800/80">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[10px] font-mono tracking-wider text-slate-500 uppercase">Commission Volume</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-400">{currencySymbol}{totalCommission.toLocaleString("en-IN")}</div>
              <p className="text-[10px] text-slate-400 mt-1 font-mono">
                {((totalCommission / Math.max(1, totalRevenue)) * 100).toFixed(1)}% avg commission rate
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800/80">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[10px] font-mono tracking-wider text-slate-500 uppercase">Completed</CardTitle>
              <FileText className="h-4 w-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{completedCount}</div>
              <p className="text-[10px] text-slate-400 mt-1 font-mono">Successful transactions</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800/80">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[10px] font-mono tracking-wider text-slate-500 uppercase">
                {isShop ? "Staff Payroll Costs" : "Outstanding Balance"}
              </CardTitle>
              {isShop ? <Users className="h-4 w-4 text-indigo-400" /> : <Calendar className="h-4 w-4 text-yellow-400" />}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${isShop ? "text-white" : "text-yellow-400"}`}>
                {currencySymbol}
                {(isShop ? totalPayrollCost : totalCommission - totalDisbursedPayouts).toLocaleString("en-IN")}
              </div>
              <p className="text-[10px] text-slate-400 mt-1 font-mono">
                {isShop ? "Approved salaries settled" : "Commission receivable"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ═══ Tabs ═══ */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="print:hidden bg-slate-900 border border-slate-800">
            <TabsTrigger value="sales" className="data-[state=active]:bg-slate-800 data-[state=active]:text-emerald-400">Sales Ledger</TabsTrigger>
            <TabsTrigger value="agents" className="data-[state=active]:bg-slate-800 data-[state=active]:text-emerald-400">Agent Performance</TabsTrigger>
            <TabsTrigger value="monthly" className="data-[state=active]:bg-slate-800 data-[state=active]:text-emerald-400">Monthly Summary</TabsTrigger>
          </TabsList>

          {/* ─── Sales Ledger Tab ─── */}
          <TabsContent value="sales" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader className="border-b border-slate-800/60 pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-xs font-bold text-slate-200 uppercase tracking-wider">Sales Volume Timeline</CardTitle>
                    <span className="text-[10px] font-mono text-emerald-400">Daily aggregate trend</span>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="h-64">
                    {salesTrendData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={salesTrendData} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="date" stroke="#64748b" fontSize={9} />
                          <YAxis stroke="#64748b" fontSize={9} />
                          <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "8px" }} />
                          <Legend verticalAlign="top" height={36} iconType="circle" />
                          <Line type="monotone" dataKey="Sales Volume" stroke="#10b981" strokeWidth={2.5} activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-xs text-slate-600 font-mono">
                        No verified sales data in this date range.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900 border-slate-800">
                <CardHeader className="border-b border-slate-800/60 pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-xs font-bold text-slate-200 uppercase tracking-wider">Agent Performance Contribution</CardTitle>
                    <span className="text-[10px] font-mono text-emerald-400">B2B sales channel</span>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="h-64">
                    {agentRevenue.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={agentRevenue} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="name" stroke="#64748b" fontSize={9} />
                          <YAxis stroke="#64748b" fontSize={9} />
                          <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "8px" }} />
                          <Legend verticalAlign="top" height={36} iconType="circle" />
                          <Bar dataKey="Sales Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Commission Paid" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-xs text-slate-600 font-mono">
                        No active reseller metrics recorded.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-slate-900 border-slate-800 overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800/60">
                <div>
                  <CardTitle className="text-xs font-bold text-slate-200 uppercase tracking-wider">Sales Ledger Report</CardTitle>
                  <CardDescription className="text-[10px] text-slate-500">Complete transaction history with commission breakdown</CardDescription>
                </div>
                <CsvExportButton data={getSalesCsvData()} filename={`sales-ledger-${new Date().toISOString().split("T")[0]}`} label="Export Sales CSV" />
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-800/60 bg-slate-950/50">
                        <th className="text-left py-3 px-4 font-medium text-slate-500 text-[10px] uppercase tracking-wider">Date</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-500 text-[10px] uppercase tracking-wider">Invoice</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-500 text-[10px] uppercase tracking-wider">Notes</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-500 text-[10px] uppercase tracking-wider">Agent</th>
                        <th className="text-right py-3 px-4 font-medium text-slate-500 text-[10px] uppercase tracking-wider">Amount</th>
                        <th className="text-right py-3 px-4 font-medium text-slate-500 text-[10px] uppercase tracking-wider">Commission</th>
                        <th className="text-center py-3 px-4 font-medium text-slate-500 text-[10px] uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sales.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-xs text-slate-600 font-mono">No sales records found in this range.</td>
                        </tr>
                      ) : (
                        sales.map((sale) => {
                          const ag = agents.find((a) => a.id === sale.agent_id)
                          return (
                            <tr key={sale.id} className="border-b border-slate-800/40 last:border-0 hover:bg-slate-800/30 transition-colors">
                              <td className="py-3 px-4 text-slate-300 text-xs">{formatDate(sale.sale_date)}</td>
                              <td className="py-3 px-4 font-mono text-[10px] text-slate-400">{sale.invoice_number || `INV-${sale.id}`}</td>
                              <td className="py-3 px-4 text-slate-300 text-xs">{sale.notes || "-"}</td>
                              <td className="py-3 px-4 text-slate-300 text-xs">{ag?.name || "Direct"}</td>
                              <td className="py-3 px-4 text-right font-medium text-slate-200 text-xs">{formatCurrency(Number(sale.amount))}</td>
                              <td className="py-3 px-4 text-right text-emerald-400 text-xs font-medium">{formatCurrency(Number(sale.commission_amount))}</td>
                              <td className="py-3 px-4 text-center">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  sale.status === "confirmed"
                                    ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40"
                                    : sale.status === "pending"
                                    ? "bg-amber-950/60 text-amber-400 border border-amber-800/40"
                                    : "bg-red-950/60 text-red-400 border border-red-800/40"
                                }`}>
                                  {sale.status}
                                </span>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                    {sales.length > 0 && (
                      <tfoot>
                        <tr className="border-t-2 border-slate-700 bg-slate-950/50">
                          <td className="py-3 px-4 text-xs font-bold text-slate-300" colSpan={4}>Total</td>
                          <td className="py-3 px-4 text-right font-bold text-white text-xs">{formatCurrency(totalRevenue)}</td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-400 text-xs">{formatCurrency(totalCommission)}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Agent Performance Tab ─── */}
          <TabsContent value="agents" className="space-y-6">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="border-b border-slate-800/60 pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xs font-bold text-slate-200 uppercase tracking-wider">Agent Revenue Contribution</CardTitle>
                  <span className="text-[10px] font-mono text-emerald-400">B2B sales channel</span>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-72">
                  {agentRevenue.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={agentRevenue} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={9} />
                        <YAxis stroke="#64748b" fontSize={9} />
                        <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "8px" }} />
                        <Legend verticalAlign="top" height={36} iconType="circle" />
                        <Bar dataKey="Sales Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Commission Paid" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-xs text-slate-600 font-mono">
                      No active reseller metrics recorded.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800 overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800/60">
                <div>
                  <CardTitle className="text-xs font-bold text-slate-200 uppercase tracking-wider">Agent Performance Report</CardTitle>
                  <CardDescription className="text-[10px] text-slate-500">Commission and sales metrics by agent</CardDescription>
                </div>
                <CsvExportButton data={getAgentCsvData()} filename={`agent-performance-${new Date().toISOString().split("T")[0]}`} label="Export Agents CSV" />
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-800/60 bg-slate-950/50">
                        <th className="text-left py-3 px-4 font-medium text-slate-500 text-[10px] uppercase tracking-wider">Agent</th>
                        <th className="text-right py-3 px-4 font-medium text-slate-500 text-[10px] uppercase tracking-wider">Total Sales</th>
                        <th className="text-right py-3 px-4 font-medium text-slate-500 text-[10px] uppercase tracking-wider">Commission</th>
                        <th className="text-center py-3 px-4 font-medium text-slate-500 text-[10px] uppercase tracking-wider">Transactions</th>
                        <th className="text-right py-3 px-4 font-medium text-slate-500 text-[10px] uppercase tracking-wider">Avg Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agentRevenue.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-xs text-slate-600 font-mono">No agent performance data in this range.</td>
                        </tr>
                      ) : (
                        agentRevenue.map((agent) => {
                          const txns = sales.filter((s) => s.status === "confirmed" && agents.find((a) => a.name === agent.name)?.id === s.agent_id).length
                          const avgRate = agent["Sales Revenue"] > 0 ? ((agent["Commission Paid"] / agent["Sales Revenue"]) * 100).toFixed(1) : "0.0"
                          return (
                            <tr key={agent.name} className="border-b border-slate-800/40 last:border-0 hover:bg-slate-800/30 transition-colors">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-blue-950 flex items-center justify-center text-xs font-bold text-blue-400 border border-blue-800/40">
                                    {agent.name.charAt(0)}
                                  </div>
                                  <span className="font-medium text-slate-300 text-xs">{agent.name}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-right font-medium text-slate-200 text-xs">{formatCurrency(agent["Sales Revenue"])}</td>
                              <td className="py-3 px-4 text-right text-emerald-400 text-xs font-medium">{formatCurrency(agent["Commission Paid"])}</td>
                              <td className="py-3 px-4 text-center text-slate-400 text-xs">{txns}</td>
                              <td className="py-3 px-4 text-right text-slate-300 text-xs">{avgRate}%</td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Monthly Summary Tab ─── */}
          <TabsContent value="monthly" className="space-y-6">
            {isShop && (
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader className="border-b border-slate-800/60 pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-xs font-bold text-slate-200 uppercase tracking-wider">Operating Cost Analysis: Commission vs. Payroll</CardTitle>
                    <span className="text-[10px] font-mono text-indigo-400">Monthly expense comparison</span>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="h-72">
                    {monthlyExpenses.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyExpenses} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="month" stroke="#64748b" fontSize={9} />
                          <YAxis stroke="#64748b" fontSize={9} />
                          <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "8px" }} />
                          <Legend verticalAlign="top" height={36} />
                          <Bar dataKey="Commission Costs" fill="#10b981" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Staff Payroll Costs" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-xs text-slate-600 font-mono">
                        No expense data in this date range.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="bg-slate-900 border-slate-800 overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800/60">
                <div>
                  <CardTitle className="text-xs font-bold text-slate-200 uppercase tracking-wider">Monthly Summary Report</CardTitle>
                  <CardDescription className="text-[10px] text-slate-500">Month-over-month performance trends</CardDescription>
                </div>
                <CsvExportButton data={getMonthlyCsvData()} filename={`monthly-summary-${new Date().toISOString().split("T")[0]}`} label="Export Monthly CSV" />
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-800/60 bg-slate-950/50">
                        <th className="text-left py-3 px-4 font-medium text-slate-500 text-[10px] uppercase tracking-wider">Month</th>
                        <th className="text-right py-3 px-4 font-medium text-slate-500 text-[10px] uppercase tracking-wider">Total Sales</th>
                        <th className="text-right py-3 px-4 font-medium text-slate-500 text-[10px] uppercase tracking-wider">Commission</th>
                        <th className="text-center py-3 px-4 font-medium text-slate-500 text-[10px] uppercase tracking-wider">Transactions</th>
                        <th className="text-center py-3 px-4 font-medium text-slate-500 text-[10px] uppercase tracking-wider">Active Agents</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyExpenses.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-xs text-slate-600 font-mono">No monthly data in this range.</td>
                        </tr>
                      ) : (
                        monthlyExpenses.map((m) => {
                          const monthKey = m.rawMonth
                          const salesInMonth = sales.filter((s) => s.sale_date.startsWith(monthKey) && s.status === "confirmed")
                          const agentsInMonth = new Set(salesInMonth.map((s) => s.agent_id)).size
                          const totalSalesMonth = salesInMonth.reduce((sum, s) => sum + Number(s.amount), 0)
                          const totalCommMonth = salesInMonth.reduce((sum, s) => sum + Number(s.commission_amount), 0)
                          return (
                            <tr key={m.month} className="border-b border-slate-800/40 last:border-0 hover:bg-slate-800/30 transition-colors">
                              <td className="py-3 px-4 font-medium text-slate-300 text-xs">{m.month}</td>
                              <td className="py-3 px-4 text-right text-slate-200 text-xs">{formatCurrency(totalSalesMonth)}</td>
                              <td className="py-3 px-4 text-right text-emerald-400 text-xs font-medium">{formatCurrency(totalCommMonth)}</td>
                              <td className="py-3 px-4 text-center text-slate-400 text-xs">{salesInMonth.length}</td>
                              <td className="py-3 px-4 text-center">
                                <div className="flex items-center justify-center gap-1 text-slate-400 text-xs">
                                  <Users className="w-3 h-3" />
                                  {agentsInMonth}
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ═══ Footer ═══ */}
        <div className="bg-slate-950 p-4 border border-slate-800 rounded-xl flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-400 leading-relaxed">
            The <strong className="text-slate-300">Pyro-Bay Analytics Engine</strong> queries operational, attendance, and sales ledger indexes dynamically. Output records are strictly locked according to Jharkhand banking division regulations.
          </p>
        </div>
      </div>
    </MainLayout>
  )
}