"use client"

import { useState } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CsvExportButton } from "@/components/reports/csv-export-button"
import { formatCurrency, formatDate } from "@/lib/csv-export"
import {
  Printer,
  FileText,
  TrendingUp,
  Users,
  ShoppingCart,
  Calendar,
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────
interface SalesRecord {
  id: string
  date: string
  invoiceNo: string
  customer: string
  agent: string
  amount: number
  commission: number
  commissionRate: number
  status: "completed" | "pending" | "reversed"
}

interface AgentPerformance {
  agentId: string
  agentName: string
  totalSales: number
  totalCommission: number
  transactions: number
  avgCommissionRate: number
}

interface MonthlySummary {
  month: string
  totalSales: number
  totalCommission: number
  transactionCount: number
  activeAgents: number
}

// ─── Mock Data ───────────────────────────────────────────
const mockSales: SalesRecord[] = [
  { id: "1", date: "2024-06-28", invoiceNo: "INV-001", customer: "Rajesh Kumar", agent: "Rahul Sharma", amount: 45000, commission: 2250, commissionRate: 5, status: "completed" },
  { id: "2", date: "2024-06-27", invoiceNo: "INV-002", customer: "Priya Patel", agent: "Amit Singh", amount: 32000, commission: 2240, commissionRate: 7, status: "completed" },
  { id: "3", date: "2024-06-26", invoiceNo: "INV-003", customer: "Suresh Gupta", agent: "Rahul Sharma", amount: 28000, commission: 1260, commissionRate: 4.5, status: "pending" },
  { id: "4", date: "2024-06-25", invoiceNo: "INV-004", customer: "Neha Verma", agent: "Priya Mehta", amount: 55000, commission: 2750, commissionRate: 5, status: "completed" },
  { id: "5", date: "2024-06-24", invoiceNo: "INV-005", customer: "Vikram Rao", agent: "Amit Singh", amount: 18000, commission: 900, commissionRate: 5, status: "reversed" },
  { id: "6", date: "2024-06-23", invoiceNo: "INV-006", customer: "Anita Desai", agent: "Rahul Sharma", amount: 62000, commission: 3100, commissionRate: 5, status: "completed" },
  { id: "7", date: "2024-06-22", invoiceNo: "INV-007", customer: "Kiran Shah", agent: "Priya Mehta", amount: 35000, commission: 1750, commissionRate: 5, status: "completed" },
  { id: "8", date: "2024-06-21", invoiceNo: "INV-008", customer: "Deepak Joshi", agent: "Amit Singh", amount: 41000, commission: 2050, commissionRate: 5, status: "pending" },
]

const mockAgentPerformance: AgentPerformance[] = [
  { agentId: "1", agentName: "Rahul Sharma", totalSales: 135000, totalCommission: 6610, transactions: 3, avgCommissionRate: 4.9 },
  { agentId: "2", agentName: "Amit Singh", totalSales: 91000, totalCommission: 5190, transactions: 3, avgCommissionRate: 5.7 },
  { agentId: "3", agentName: "Priya Mehta", totalSales: 90000, totalCommission: 4500, transactions: 2, avgCommissionRate: 5.0 },
]

const mockMonthly: MonthlySummary[] = [
  { month: "Jan 2024", totalSales: 320000, totalCommission: 16000, transactionCount: 45, activeAgents: 3 },
  { month: "Feb 2024", totalSales: 280000, totalCommission: 14000, transactionCount: 38, activeAgents: 3 },
  { month: "Mar 2024", totalSales: 410000, totalCommission: 20500, transactionCount: 52, activeAgents: 4 },
  { month: "Apr 2024", totalSales: 350000, totalCommission: 17500, transactionCount: 48, activeAgents: 3 },
  { month: "May 2024", totalSales: 390000, totalCommission: 19500, transactionCount: 55, activeAgents: 4 },
  { month: "Jun 2024", totalSales: 316000, totalCommission: 15800, transactionCount: 42, activeAgents: 3 },
]

// ─── CSV Data Transformers ───────────────────────────────
// All return Record<string, string | number>[] for type safety
function getSalesCsvData(records: SalesRecord[]): Record<string, string | number>[] {
  return records.map((r) => ({
    Date: formatDate(r.date),
    "Invoice No": r.invoiceNo,
    Customer: r.customer,
    Agent: r.agent,
    Amount: formatCurrency(r.amount),
    "Commission Rate": `${r.commissionRate}%`,
    Commission: formatCurrency(r.commission),
    Status: r.status.charAt(0).toUpperCase() + r.status.slice(1),
  }))
}

function getAgentCsvData(agents: AgentPerformance[]): Record<string, string | number>[] {
  return agents.map((a) => ({
    "Agent Name": a.agentName,
    "Total Sales": formatCurrency(a.totalSales),
    "Total Commission": formatCurrency(a.totalCommission),
    Transactions: a.transactions,
    "Avg Commission Rate": `${a.avgCommissionRate}%`,
  }))
}

function getMonthlyCsvData(months: MonthlySummary[]): Record<string, string | number>[] {
  return months.map((m) => ({
    Month: m.month,
    "Total Sales": formatCurrency(m.totalSales),
    "Total Commission": formatCurrency(m.totalCommission),
    Transactions: m.transactionCount,
    "Active Agents": m.activeAgents,
  }))
}

// ─── Component ───────────────────────────────────────────
export default function ShopReportsPage({ params }: { params: { shopId: string } }) {
  const [activeTab, setActiveTab] = useState("sales")

  const handlePrint = () => {
    window.print()
  }

  const totalSales = mockSales.reduce((sum, s) => sum + s.amount, 0)
  const totalCommission = mockSales.reduce((sum, s) => sum + s.commission, 0)
  const completedCount = mockSales.filter((s) => s.status === "completed").length
  const pendingCount = mockSales.filter((s) => s.status === "pending").length

  return (
    <MainLayout title="Reports & Analytics">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Reports & Analytics</h2>
            <p className="text-muted-foreground">
              Generate, export, and analyze your business performance data.
            </p>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <CsvExportButton
              data={
                activeTab === "sales"
                  ? getSalesCsvData(mockSales)
                  : activeTab === "agents"
                  ? getAgentCsvData(mockAgentPerformance)
                  : getMonthlyCsvData(mockMonthly)
              }
              filename={`shop-reports-${activeTab}-${new Date().toISOString().split("T")[0]}`}
            />
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Sales</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalSales)}</div>
              <p className="text-xs text-muted-foreground">{mockSales.length} transactions</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Commission</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalCommission)}</div>
              <p className="text-xs text-muted-foreground">
                {((totalCommission / totalSales) * 100).toFixed(1)}% avg rate
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
              <FileText className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{completedCount}</div>
              <p className="text-xs text-muted-foreground">Successful transactions</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
              <Calendar className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{pendingCount}</div>
              <p className="text-xs text-muted-foreground">Awaiting approval</p>
            </CardContent>
          </Card>
        </div>

        {/* Report Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="print:hidden">
            <TabsTrigger value="sales">Sales Ledger</TabsTrigger>
            <TabsTrigger value="agents">Agent Performance</TabsTrigger>
            <TabsTrigger value="monthly">Monthly Summary</TabsTrigger>
          </TabsList>

          {/* Sales Ledger Tab */}
          <TabsContent value="sales" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Sales Ledger Report</CardTitle>
                  <CardDescription>Complete transaction history with commission breakdown</CardDescription>
                </div>
                <CsvExportButton
                  data={getSalesCsvData(mockSales)}
                  filename={`sales-ledger-${new Date().toISOString().split("T")[0]}`}
                  label="Export Sales CSV"
                />
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Invoice</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Customer</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Agent</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">Amount</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">Commission</th>
                        <th className="text-center py-3 px-4 font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockSales.map((sale) => (
                        <tr key={sale.id} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="py-3 px-4">{formatDate(sale.date)}</td>
                          <td className="py-3 px-4 font-mono text-xs">{sale.invoiceNo}</td>
                          <td className="py-3 px-4">{sale.customer}</td>
                          <td className="py-3 px-4">{sale.agent}</td>
                          <td className="py-3 px-4 text-right font-medium">{formatCurrency(sale.amount)}</td>
                          <td className="py-3 px-4 text-right text-emerald-600">{formatCurrency(sale.commission)}</td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                sale.status === "completed"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : sale.status === "pending"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {sale.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 font-semibold">
                        <td className="py-3 px-4" colSpan={4}>Total</td>
                        <td className="py-3 px-4 text-right">{formatCurrency(totalSales)}</td>
                        <td className="py-3 px-4 text-right text-emerald-600">{formatCurrency(totalCommission)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Agent Performance Tab */}
          <TabsContent value="agents" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Agent Performance Report</CardTitle>
                  <CardDescription>Commission and sales metrics by agent</CardDescription>
                </div>
                <CsvExportButton
                  data={getAgentCsvData(mockAgentPerformance)}
                  filename={`agent-performance-${new Date().toISOString().split("T")[0]}`}
                  label="Export Agents CSV"
                />
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Agent</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">Total Sales</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">Commission</th>
                        <th className="text-center py-3 px-4 font-medium text-muted-foreground">Transactions</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">Avg Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockAgentPerformance.map((agent) => (
                        <tr key={agent.agentId} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">
                                {agent.agentName.charAt(0)}
                              </div>
                              <span className="font-medium">{agent.agentName}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-medium">{formatCurrency(agent.totalSales)}</td>
                          <td className="py-3 px-4 text-right text-emerald-600">{formatCurrency(agent.totalCommission)}</td>
                          <td className="py-3 px-4 text-center">{agent.transactions}</td>
                          <td className="py-3 px-4 text-right">{agent.avgCommissionRate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Monthly Summary Tab */}
          <TabsContent value="monthly" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Monthly Summary Report</CardTitle>
                  <CardDescription>Month-over-month performance trends</CardDescription>
                </div>
                <CsvExportButton
                  data={getMonthlyCsvData(mockMonthly)}
                  filename={`monthly-summary-${new Date().toISOString().split("T")[0]}`}
                  label="Export Monthly CSV"
                />
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Month</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">Total Sales</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">Commission</th>
                        <th className="text-center py-3 px-4 font-medium text-muted-foreground">Transactions</th>
                        <th className="text-center py-3 px-4 font-medium text-muted-foreground">Active Agents</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockMonthly.map((month) => (
                        <tr key={month.month} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="py-3 px-4 font-medium">{month.month}</td>
                          <td className="py-3 px-4 text-right">{formatCurrency(month.totalSales)}</td>
                          <td className="py-3 px-4 text-right text-emerald-600">{formatCurrency(month.totalCommission)}</td>
                          <td className="py-3 px-4 text-center">{month.transactionCount}</td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Users className="w-3 h-3 text-muted-foreground" />
                              {month.activeAgents}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
}
