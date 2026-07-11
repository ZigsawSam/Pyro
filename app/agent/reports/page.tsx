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
  TrendingUp,
  ShoppingBag,
  Calendar,
  Store,
  FileText,
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────
interface CommissionRecord {
  id: string
  date: string
  shopName: string
  location: string
  salesAmount: number
  commissionRate: number
  commission: number
  status: "confirmed" | "pending" | "processing" | "rejected"
  payoutMonth: string
}

interface ShopBreakdown {
  shopId: string
  shopName: string
  location: string
  totalSales: number
  totalCommission: number
  transactions: number
}

interface MonthlyEarnings {
  month: string
  totalCommission: number
  confirmed: number
  pending: number
  processing: number
  transactions: number
}

// ─── Mock Data ───────────────────────────────────────────
const mockCommissions: CommissionRecord[] = [
  { id: "1", date: "2024-06-28", shopName: "Rajesh General Store", location: "Raxaul", salesAmount: 45000, commissionRate: 5, commission: 2250, status: "confirmed", payoutMonth: "June 2024" },
  { id: "2", date: "2024-06-27", shopName: "Patel Electronics", location: "Delhi", salesAmount: 32000, commissionRate: 7, commission: 2240, status: "pending", payoutMonth: "June 2024" },
  { id: "3", date: "2024-06-26", shopName: "Kumar Mart", location: "Bangalore", salesAmount: 28000, commissionRate: 4.5, commission: 1260, status: "processing", payoutMonth: "July 2024" },
  { id: "4", date: "2024-06-25", shopName: "Rajesh General Store", location: "Raxaul", salesAmount: 62000, commissionRate: 5, commission: 3100, status: "confirmed", payoutMonth: "June 2024" },
  { id: "5", date: "2024-06-24", shopName: "Singh Traders", location: "Mumbai", salesAmount: 18000, commissionRate: 5, commission: 900, status: "rejected", payoutMonth: "June 2024" },
  { id: "6", date: "2024-06-23", shopName: "Patel Electronics", location: "Delhi", salesAmount: 41000, commissionRate: 5, commission: 2050, status: "confirmed", payoutMonth: "June 2024" },
  { id: "7", date: "2024-06-22", shopName: "Kumar Mart", location: "Bangalore", salesAmount: 35000, commissionRate: 5, commission: 1750, status: "pending", payoutMonth: "July 2024" },
  { id: "8", date: "2024-06-21", shopName: "Rajesh General Store", location: "Raxaul", salesAmount: 28000, commissionRate: 5, commission: 1400, status: "confirmed", payoutMonth: "June 2024" },
]

const mockShopBreakdown: ShopBreakdown[] = [
  { shopId: "1", shopName: "Rajesh General Store", location: "Raxaul", totalSales: 135000, totalCommission: 6750, transactions: 3 },
  { shopId: "2", shopName: "Patel Electronics", location: "Delhi", totalSales: 73000, totalCommission: 4290, transactions: 2 },
  { shopId: "3", shopName: "Kumar Mart", location: "Bangalore", totalSales: 63000, totalCommission: 3010, transactions: 2 },
  { shopId: "4", shopName: "Singh Traders", location: "Mumbai", totalSales: 18000, totalCommission: 900, transactions: 1 },
]

const mockMonthlyEarnings: MonthlyEarnings[] = [
  { month: "Jan 2024", totalCommission: 8200, confirmed: 6200, pending: 1500, processing: 500, transactions: 12 },
  { month: "Feb 2024", totalCommission: 7100, confirmed: 5500, pending: 1200, processing: 400, transactions: 10 },
  { month: "Mar 2024", totalCommission: 10500, confirmed: 8000, pending: 1800, processing: 700, transactions: 15 },
  { month: "Apr 2024", totalCommission: 9200, confirmed: 7000, pending: 1600, processing: 600, transactions: 13 },
  { month: "May 2024", totalCommission: 11200, confirmed: 8500, pending: 1900, processing: 800, transactions: 16 },
  { month: "Jun 2024", totalCommission: 12950, confirmed: 10000, pending: 2150, processing: 800, transactions: 18 },
]

// ─── CSV Data Transformers ───────────────────────────────
// All return Record<string, string | number>[] for type safety
function getCommissionCsvData(records: CommissionRecord[]): Record<string, string | number>[] {
  return records.map((r) => ({
    Date: formatDate(r.date),
    Shop: r.shopName,
    Location: r.location,
    "Sales Amount": formatCurrency(r.salesAmount),
    Rate: `${r.commissionRate}%`,
    Commission: formatCurrency(r.commission),
    Status: r.status.charAt(0).toUpperCase() + r.status.slice(1),
    "Payout Month": r.payoutMonth,
  }))
}

function getShopCsvData(shops: ShopBreakdown[]): Record<string, string | number>[] {
  return shops.map((s) => ({
    "Shop Name": s.shopName,
    Location: s.location,
    "Total Sales": formatCurrency(s.totalSales),
    "Total Commission": formatCurrency(s.totalCommission),
    Transactions: s.transactions,
  }))
}

function getMonthlyCsvData(months: MonthlyEarnings[]): Record<string, string | number>[] {
  return months.map((m) => ({
    Month: m.month,
    "Total Commission": formatCurrency(m.totalCommission),
    Confirmed: formatCurrency(m.confirmed),
    Pending: formatCurrency(m.pending),
    Processing: formatCurrency(m.processing),
    Transactions: m.transactions,
  }))
}

// ─── Component ───────────────────────────────────────────
export default function AgentReportsPage() {
  const [activeTab, setActiveTab] = useState("commissions")

  const handlePrint = () => {
    window.print()
  }

  const totalCommission = mockCommissions.reduce((sum, c) => sum + c.commission, 0)
  const confirmedTotal = mockCommissions
    .filter((c) => c.status === "confirmed")
    .reduce((sum, c) => sum + c.commission, 0)
  const pendingTotal = mockCommissions
    .filter((c) => c.status === "pending")
    .reduce((sum, c) => sum + c.commission, 0)
  const totalSales = mockCommissions.reduce((sum, c) => sum + c.salesAmount, 0)

  return (
    <MainLayout title="My Reports" isAgent={true}>
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">My Reports</h2>
            <p className="text-muted-foreground">
              View and export your commission history and performance data.
            </p>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <CsvExportButton
              data={
                activeTab === "commissions"
                  ? getCommissionCsvData(mockCommissions)
                  : activeTab === "shops"
                  ? getShopCsvData(mockShopBreakdown)
                  : getMonthlyCsvData(mockMonthlyEarnings)
              }
              filename={`agent-reports-${activeTab}-${new Date().toISOString().split("T")[0]}`}
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
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Commission</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalCommission)}</div>
              <p className="text-xs text-muted-foreground">Lifetime earnings</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Confirmed</CardTitle>
              <FileText className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{formatCurrency(confirmedTotal)}</div>
              <p className="text-xs text-muted-foreground">Ready for payout</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
              <Calendar className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{formatCurrency(pendingTotal)}</div>
              <p className="text-xs text-muted-foreground">Awaiting approval</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Sales</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalSales)}</div>
              <p className="text-xs text-muted-foreground">{mockCommissions.length} transactions</p>
            </CardContent>
          </Card>
        </div>

        {/* Report Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="print:hidden">
            <TabsTrigger value="commissions">Commission History</TabsTrigger>
            <TabsTrigger value="shops">Shop Breakdown</TabsTrigger>
            <TabsTrigger value="monthly">Monthly Earnings</TabsTrigger>
          </TabsList>

          {/* Commission History Tab */}
          <TabsContent value="commissions" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Commission History</CardTitle>
                  <CardDescription>Detailed record of all your commission earnings</CardDescription>
                </div>
                <CsvExportButton
                  data={getCommissionCsvData(mockCommissions)}
                  filename={`commission-history-${new Date().toISOString().split("T")[0]}`}
                  label="Export CSV"
                />
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Shop</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Location</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">Sales</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">Rate</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">Commission</th>
                        <th className="text-center py-3 px-4 font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockCommissions.map((record) => (
                        <tr key={record.id} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="py-3 px-4">{formatDate(record.date)}</td>
                          <td className="py-3 px-4 font-medium">{record.shopName}</td>
                          <td className="py-3 px-4 text-muted-foreground">{record.location}</td>
                          <td className="py-3 px-4 text-right">{formatCurrency(record.salesAmount)}</td>
                          <td className="py-3 px-4 text-right">{record.commissionRate}%</td>
                          <td className="py-3 px-4 text-right font-medium text-emerald-600">{formatCurrency(record.commission)}</td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                record.status === "confirmed"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : record.status === "pending"
                                  ? "bg-amber-100 text-amber-700"
                                  : record.status === "processing"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {record.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 font-semibold">
                        <td className="py-3 px-4" colSpan={5}>Total</td>
                        <td className="py-3 px-4 text-right text-emerald-600">{formatCurrency(totalCommission)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Shop Breakdown Tab */}
          <TabsContent value="shops" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Shop Performance Breakdown</CardTitle>
                  <CardDescription>Commission earnings by shop</CardDescription>
                </div>
                <CsvExportButton
                  data={getShopCsvData(mockShopBreakdown)}
                  filename={`shop-breakdown-${new Date().toISOString().split("T")[0]}`}
                  label="Export CSV"
                />
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Shop</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Location</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">Total Sales</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">Commission</th>
                        <th className="text-center py-3 px-4 font-medium text-muted-foreground">Transactions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockShopBreakdown.map((shop) => (
                        <tr key={shop.shopId} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                                <Store className="w-4 h-4 text-purple-700" />
                              </div>
                              <span className="font-medium">{shop.shopName}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">{shop.location}</td>
                          <td className="py-3 px-4 text-right">{formatCurrency(shop.totalSales)}</td>
                          <td className="py-3 px-4 text-right font-medium text-emerald-600">{formatCurrency(shop.totalCommission)}</td>
                          <td className="py-3 px-4 text-center">{shop.transactions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Monthly Earnings Tab */}
          <TabsContent value="monthly" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Monthly Earnings Report</CardTitle>
                  <CardDescription>Month-over-month commission breakdown</CardDescription>
                </div>
                <CsvExportButton
                  data={getMonthlyCsvData(mockMonthlyEarnings)}
                  filename={`monthly-earnings-${new Date().toISOString().split("T")[0]}`}
                  label="Export CSV"
                />
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Month</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">Total</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">Confirmed</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">Pending</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">Processing</th>
                        <th className="text-center py-3 px-4 font-medium text-muted-foreground">Transactions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockMonthlyEarnings.map((month) => (
                        <tr key={month.month} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="py-3 px-4 font-medium">{month.month}</td>
                          <td className="py-3 px-4 text-right font-bold">{formatCurrency(month.totalCommission)}</td>
                          <td className="py-3 px-4 text-right text-emerald-600">{formatCurrency(month.confirmed)}</td>
                          <td className="py-3 px-4 text-right text-amber-600">{formatCurrency(month.pending)}</td>
                          <td className="py-3 px-4 text-right text-blue-600">{formatCurrency(month.processing)}</td>
                          <td className="py-3 px-4 text-center">{month.transactions}</td>
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
