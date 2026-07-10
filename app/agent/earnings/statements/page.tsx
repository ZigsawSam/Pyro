"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, FileText, Download, Mail, ArrowLeft, Calendar } from "lucide-react"
import { createAgentClient } from "@/lib/supabase/agent-client"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface Statement {
  month: string
  year: number
  totalSales: number
  totalCommission: number
  totalPayout: number
  shopsCount: number
  transactions: number
}

export default function StatementsPage() {
  const router = useRouter()
  const supabase = createAgentClient()
  const [agentId, setAgentId] = useState<number | null>(null)
  const [agentName, setAgentName] = useState("")
  const [loading, setLoading] = useState(true)
  const [statements, setStatements] = useState<Statement[]>([])

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
        .select("amount, commission_amount, sale_date")
        .eq("agent_id", id)

      const { data: payouts } = await supabase
        .from("payouts")
        .select("amount_paid, created_at")
        .eq("agent_id", id)

      // Group by month
      const monthMap = new Map<string, Statement>()

      ;(sales || []).forEach((s: any) => {
        const date = new Date(s.sale_date)
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        const monthName = date.toLocaleDateString("en-IN", { month: "long" })

        if (!monthMap.has(key)) {
          monthMap.set(key, {
            month: monthName,
            year: date.getFullYear(),
            totalSales: 0,
            totalCommission: 0,
            totalPayout: 0,
            shopsCount: 0,
            transactions: 0,
          })
        }

        const stmt = monthMap.get(key)!
        stmt.totalSales += Number(s.amount || 0)
        stmt.totalCommission += Number(s.commission_amount || 0)
        stmt.transactions += 1
      })

      ;(payouts || []).forEach((p: any) => {
        const date = new Date(p.created_at)
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        if (monthMap.has(key)) {
          monthMap.get(key)!.totalPayout += Number(p.amount_paid || 0)
        }
      })

      const sorted = Array.from(monthMap.values())
        .sort((a, b) => b.year - a.year || new Date(`1 ${b.month}`).getMonth() - new Date(`1 ${a.month}`).getMonth())

      setStatements(sorted)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  if (!agentId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <MainLayout title="Statements" isAgent={true} userName={agentName} agentId={agentId}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Button variant="outline" size="sm" onClick={() => router.push("/agent/earnings")} className="mb-3 border-slate-200 gap-1.5">
            <ArrowLeft size={16} /> Back to Earnings
          </Button>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Statements</h1>
              <p className="text-sm text-slate-500 mt-1">Download monthly statements and reports</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin h-8 w-8 text-slate-400" />
          </div>
        ) : (
          <>
            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-5 bg-white border-slate-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Download size={20} className="text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Export CSV</h3>
                    <p className="text-sm text-slate-500">Download all transactions</p>
                  </div>
                </div>
              </Card>
              <Card className="p-5 bg-white border-slate-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                    <FileText size={20} className="text-purple-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Download PDF</h3>
                    <p className="text-sm text-slate-500">Monthly statement PDF</p>
                  </div>
                </div>
              </Card>
              <Card className="p-5 bg-white border-slate-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                    <Mail size={20} className="text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Email Statement</h3>
                    <p className="text-sm text-slate-500">Send to your email</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Monthly Statements */}
            <Card className="bg-white border-slate-100 shadow-sm">
              <div className="p-5 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900">Monthly Statements</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {statements.map((stmt) => (
                  <div key={`${stmt.month}-${stmt.year}`} className="p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 flex flex-col items-center justify-center">
                        <Calendar size={16} className="text-slate-500" />
                        <span className="text-[10px] font-bold text-slate-600">{stmt.year.toString().slice(-2)}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{stmt.month} {stmt.year}</p>
                        <p className="text-sm text-slate-500">{stmt.transactions} transactions • {stmt.shopsCount} shops</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm text-slate-500">Commission</p>
                        <p className="font-bold text-slate-900">₹{stmt.totalCommission.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-500">Payout</p>
                        <p className="font-bold text-emerald-600">₹{stmt.totalPayout.toLocaleString()}</p>
                      </div>
                      <Button variant="outline" size="sm" className="border-slate-200 gap-1.5">
                        <Download size={14} /> Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              {statements.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <FileText size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No statements yet</p>
                  <p className="text-sm">Complete sales to generate monthly statements</p>
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </MainLayout>
  )
}