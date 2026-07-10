"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Wallet, ArrowUpRight, ArrowDownRight, Minus, Clock, CheckCircle, Banknote } from "lucide-react"
import { createAgentClient } from "@/lib/supabase/agent-client"
import { MainLayout } from "@/components/layout/main-layout"
import { CommissionTrendChart } from "@/components/dashboard/CommissionTrendChart"
import { CommissionBreakdown } from "@/components/dashboard/CommissionBreakdown"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface EarningStats {
  totalEarned: number
  pending: number
  paid: number
  processing: number
  nextPayout: number
  nextPayoutDate: string
}

export default function EarningsOverviewPage() {
  const router = useRouter()
  const supabase = createAgentClient()
  const [agentId, setAgentId] = useState<number | null>(null)
  const [agentName, setAgentName] = useState("")
  const [loading, setLoading] = useState(true)
  const [salesRecords, setSalesRecords] = useState<any[]>([])
  const [payouts, setPayouts] = useState<any[]>([])

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/auth/agent-login"); return }
      const { data: agent } = await supabase.from("agents").select("id, name").eq("user_id", user.id).single()
      if (!agent) { router.push("/auth/agent-login"); return }
      setAgentId(agent.id)
      setAgentName(agent.name)
      fetchData(agent.id)
    }
    checkAuth()
  }, [router, supabase])

  const fetchData = async (id: number) => {
    setLoading(true)
    try {
      const { data: sales } = await supabase
        .from("sales")
        .select("id, shop_id, amount, commission_amount, sale_date")
        .eq("agent_id", id)
        .order("sale_date", { ascending: false })

      const { data: payoutData } = await supabase
        .from("payouts")
        .select("sale_id, amount_paid, status, created_at")
        .eq("agent_id", id)

      setSalesRecords(sales || [])
      setPayouts(payoutData || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const stats = useMemo((): EarningStats => {
    const totalEarned = salesRecords.reduce((sum, r) => sum + Number(r.commission_amount || 0), 0)
    
    const paidSaleIds = new Set(payouts.filter((p: any) => p.amount_paid > 0).map((p: any) => p.sale_id))
    const processingIds = new Set(payouts.filter((p: any) => p.status === "processing").map((p: any) => p.sale_id))
    
    const paid = salesRecords
      .filter((r) => paidSaleIds.has(r.id))
      .reduce((sum, r) => sum + Number(r.commission_amount || 0), 0)
    
    const processing = salesRecords
      .filter((r) => processingIds.has(r.id))
      .reduce((sum, r) => sum + Number(r.commission_amount || 0), 0)
    
    const pending = totalEarned - paid - processing

    // Next payout = all pending commissions
    const nextPayout = pending
    const nextDate = new Date()
    nextDate.setDate(nextDate.getDate() + 15)

    return {
      totalEarned,
      pending,
      paid,
      processing,
      nextPayout,
      nextPayoutDate: nextDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    }
  }, [salesRecords, payouts])

  const dailyCommissions = useMemo(() => {
    const days: { date: string; amount: number }[] = []
    for (let i = 9; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split("T")[0]
      const dayTotal = salesRecords
        .filter((s: any) => s.sale_date?.startsWith(dateStr))
        .reduce((sum, s) => sum + Number(s.commission_amount || 0), 0)
      days.push({ date: dateStr, amount: dayTotal })
    }
    return days
  }, [salesRecords])

  const statCards = [
    { label: "Total Earned", value: stats.totalEarned, icon: Wallet, color: "blue", trend: 14.3 },
    { label: "Pending", value: stats.pending, icon: Clock, color: "amber", trend: undefined },
    { label: "Paid", value: stats.paid, icon: CheckCircle, color: "emerald", trend: undefined },
    { label: "Processing", value: stats.processing, icon: Banknote, color: "blue", trend: undefined },
  ]

  if (!agentId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <MainLayout title="Earnings" isAgent={true} userName={agentName} agentId={agentId}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Earnings</h1>
          <p className="text-sm text-slate-500 mt-1">Track your income, commissions, and payouts</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin h-8 w-8 text-slate-400" />
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {statCards.map((stat) => (
                <Card key={stat.label} className="p-5 bg-white border-slate-100 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">₹{stat.value.toLocaleString()}</p>
                      {stat.trend !== undefined && (
                        <div className="flex items-center gap-1 mt-2 text-sm">
                          <ArrowUpRight size={14} className="text-emerald-500" />
                          <span className="text-emerald-500 font-medium">{stat.trend}%</span>
                          <span className="text-slate-400">vs last month</span>
                        </div>
                      )}
                    </div>
                    <div className={`w-10 h-10 rounded-xl bg-${stat.color}-50 flex items-center justify-center`}>
                      <stat.icon size={20} className={`text-${stat.color}-500`} />
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Next Payout Card */}
            {stats.nextPayout > 0 && (
              <Card className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                      <Banknote size={24} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Next Expected Payout</p>
                      <p className="text-3xl font-bold text-slate-900">₹{stats.nextPayout.toLocaleString()}</p>
                      <p className="text-sm text-slate-500">Expected by <span className="font-medium text-slate-700">{stats.nextPayoutDate}</span></p>
                    </div>
                  </div>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    Request Payout
                  </Button>
                </div>
              </Card>
            )}

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <CommissionTrendChart data={dailyCommissions} title="Earnings Trend" />
              </div>
              <CommissionBreakdown
                confirmed={stats.paid}
                pending={stats.pending}
                processing={stats.processing}
                rejected={0}
                total={stats.totalEarned}
              />
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-5 bg-white border-slate-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push("/agent/earnings/commissions")}>
                <h3 className="font-semibold text-slate-900 mb-1">Commission History</h3>
                <p className="text-sm text-slate-500">View all commission records by shop and date</p>
              </Card>
              <Card className="p-5 bg-white border-slate-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push("/agent/earnings/payouts")}>
                <h3 className="font-semibold text-slate-900 mb-1">Payouts</h3>
                <p className="text-sm text-slate-500">Track withdrawal requests and payment history</p>
              </Card>
              <Card className="p-5 bg-white border-slate-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push("/agent/earnings/statements")}>
                <h3 className="font-semibold text-slate-900 mb-1">Statements</h3>
                <p className="text-sm text-slate-500">Download monthly statements in CSV or PDF</p>
              </Card>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  )
}