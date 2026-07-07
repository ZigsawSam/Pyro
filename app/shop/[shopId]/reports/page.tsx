"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { Card } from "@/components/ui/card"
import { StatCard } from "@/components/stat-card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts"
import { TrendingUp, Users, DollarSign } from "lucide-react"

interface ReportData {
  agent_name: string
  total_sales: number
  commission: number
}

interface PayrollData {
  month: string
  total_paid: number
  total_staff: number
}

export default function ReportsPage() {
  const params = useParams()
  const shopId = Number(params.shopId as string)
  const [agentReport, setAgentReport] = useState<ReportData[]>([])
  const [payrollReport, setPayrollReport] = useState<PayrollData[]>([])
  const [totals, setTotals] = useState({ sales: 0, commission: 0, payroll: 0 })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchReports()
  }, [shopId])

  const fetchReports = async () => {
    try {
      const response = await fetch(`/api/shops/${shopId}/reports`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("shop_token")}` },
      })

      if (!response.ok) throw new Error("Failed to fetch reports")

      const data = await response.json()
      setAgentReport(data.agent_report)
      setPayrollReport(data.payroll_report)
      setTotals(data.totals)
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <MainLayout title="Reports & Analytics" subtitle="Business intelligence dashboard" shopId={shopId}>
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <StatCard
              label="Total Sales"
              value={`₹${totals.sales.toLocaleString()}`}
              icon={<TrendingUp />}
              variant="primary"
            />
            <StatCard
              label="Commission Paid"
              value={`₹${totals.commission.toLocaleString()}`}
              icon={<DollarSign />}
              variant="secondary"
            />
            <StatCard
              label="Total Payroll"
              value={`₹${totals.payroll.toLocaleString()}`}
              icon={<Users />}
              variant="accent"
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Agent Commission Performance</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={agentReport}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="agent_name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total_sales" fill="var(--color-primary)" name="Sales" />
                  <Bar dataKey="commission" fill="var(--color-accent)" name="Commission" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Monthly Payroll Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={payrollReport}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="total_paid" stroke="var(--color-primary)" name="Payroll" />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </>
      )}
    </MainLayout>
  )
}
