"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Wallet, Clock, CheckCircle, Banknote, ArrowRight } from "lucide-react"
import { createAgentClient } from "@/lib/supabase/agent-client"
import { MainLayout } from "@/components/layout/main-layout"
import { CommissionTrendChart } from "@/components/dashboard/agent/CommissionTrendChart"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface EarningsOverviewPageProps {
  user?: any
  agentId?: string
}

export function EarningsOverviewPage({ user, agentId: agentIdProp }: EarningsOverviewPageProps) {
  const router = useRouter()
  const supabase = createAgentClient()
  
  const agentId = agentIdProp ? parseInt(agentIdProp, 10) : null
  
  const [agentName, setAgentName] = useState("")
  const [loading, setLoading] = useState(true)
  const [salesRecords, setSalesRecords] = useState<any[]>([])
  const [payouts, setPayouts] = useState<any[]>([])

  useEffect(() => {
    if (agentId) {
      fetchAgentName(agentId)
      fetchData(agentId)
    }
  }, [agentId])

  const fetchAgentName = async (id: number) => {
    try {
      const { data: agent } = await supabase
        .from("agents")
        .select("name")
        .eq("id", id)
        .single()
      if (agent) setAgentName(agent.name)
    } catch (e) {
      console.error("fetchAgentName error:", e)
    }
  }

  const fetchData = async (id: number) => {
    setLoading(true)
    try {
      const [{ data: sales }, { data: payoutData }] = await Promise.all([
        supabase.from("sales").select("amount, commission_amount, sale_date").eq("agent_id", id),
        supabase.from("payouts").select("sale_id, amount_paid, status").eq("agent_id", id),
      ])
      setSalesRecords(sales || [])
      setPayouts(payoutData || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const stats = useMemo(() => {
    const totalEarned = salesRecords.reduce((sum, r) => sum + Number(r.commission_amount || 0), 0)
    const paidIds = new Set(payouts.filter((p: any) => p.amount_paid > 0).map((p: any) => p.sale_id))
    const processingIds = new Set(payouts.filter((p: any) => p.status === "processing").map((p: any) => p.sale_id))
    const paid = salesRecords.filter((r) => paidIds.has(r.id)).reduce((sum, r) => sum + Number(r.commission_amount || 0), 0)
    const processing = salesRecords.filter((r) => processingIds.has(r.id)).reduce((sum, r) => sum + Number(r.commission_amount || 0), 0)
    const pending = totalEarned - paid - processing
    return { totalEarned, pending, paid, processing }
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
    { label: "Pending", value: stats.pending, icon: Clock, color: "amber" },
    { label: "Paid", value: stats.paid, icon: CheckCircle, color: "emerald" },
    { label: "Processing", value: stats.processing, icon: Banknote, color: "blue" },
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
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {statCards.map((stat) => (
                <Card key={stat.label} className="p-5 bg-white border-slate-100 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">₹{stat.value.toLocaleString()}</p>
                      {stat.trend && (
                        <p className="text-xs text-emerald-500 mt-1">↑ {stat.trend}% vs last month</p>
                      )}
                    </div>
                    <div className={`w-10 h-10 rounded-xl bg-${stat.color}-50 flex items-center justify-center`}>
                      <stat.icon size={20} className={`text-${stat.color}-500`} />
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Next Payout */}
            {stats.pending > 0 && (
              <Card className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                      <Banknote size={24} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Available for Payout</p>
                      <p className="text-3xl font-bold text-slate-900">₹{stats.pending.toLocaleString()}</p>
                    </div>
                  </div>
                  <Button onClick={() => router.push("/agent/earnings/payouts")} className="bg-blue-600 hover:bg-blue-700 text-white">
                    Go to Payouts <ArrowRight size={16} className="ml-1" />
                  </Button>
                </div>
              </Card>
            )}

            {/* Trend Chart */}
            <CommissionTrendChart data={dailyCommissions} title="Earnings Trend" />

            {/* Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { title: "Commission History", desc: "View all commission records", href: "/agent/earnings/commissions" },
                { title: "Payouts", desc: "Track withdrawals", href: "/agent/earnings/payouts" },
                { title: "Statements", desc: "Download reports", href: "/agent/earnings/statements" },
              ].map((link) => (
                <Card
                  key={link.title}
                  className="p-5 bg-white border-slate-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push(link.href)}
                >
                  <h3 className="font-semibold text-slate-900 mb-1">{link.title}</h3>
                  <p className="text-sm text-slate-500">{link.desc}</p>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </MainLayout>
  )
}