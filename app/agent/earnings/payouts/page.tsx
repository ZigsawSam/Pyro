"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Banknote, Clock, CheckCircle, XCircle, ArrowLeft, Download } from "lucide-react"
import { createAgentClient } from "@/lib/supabase/agent-client"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface PayoutRecord {
  id: number
  amount_paid: number
  status: "pending" | "processing" | "paid" | "rejected"
  created_at: string
  shop_name: string
}

export default function PayoutsPage() {
  const router = useRouter()
  const supabase = createAgentClient()
  const [agentId, setAgentId] = useState<number | null>(null)
  const [agentName, setAgentName] = useState("")
  const [loading, setLoading] = useState(true)
  const [payouts, setPayouts] = useState<PayoutRecord[]>([])
  const [requesting, setRequesting] = useState(false)
  const [pendingAmount, setPendingAmount] = useState(0)

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
      const [{ data: sales }, { data: payoutData }] = await Promise.all([
        supabase.from("sales").select("id, commission_amount").eq("agent_id", id),
        supabase.from("payouts").select("id, sale_id, amount_paid, status, created_at, shops:shop_id (shop_name)").eq("agent_id", id).order("created_at", { ascending: false }),
      ])

      // Calculate pending amount
      const totalEarned = (sales || []).reduce((sum: number, s: any) => sum + Number(s.commission_amount || 0), 0)
      const totalPaid = (payoutData || []).reduce((sum: number, p: any) => sum + Number(p.amount_paid || 0), 0)
      setPendingAmount(Math.max(0, totalEarned - totalPaid))

      const formatted = (payoutData || []).map((p: any) => ({
        id: p.id,
        amount_paid: Number(p.amount_paid || 0),
        status: p.status || "pending",
        created_at: p.created_at,
        shop_name: p.shops?.shop_name || "Payout",
      }))

      setPayouts(formatted)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleRequestPayout = async () => {
    if (!agentId || pendingAmount <= 0) return
    setRequesting(true)
    try {
      const { error } = await supabase.from("payouts").insert({
        agent_id: agentId,
        amount_paid: pendingAmount,
        status: "pending",
        person_type: "agent",
        shop_id: null, // Assuming this is a general payout not tied to a specific shop
        staff_id: null, // Assuming this is a general payout not tied to a specific staff
        payment_date: new Date().toISOString().split ("T")[0], // Current date in YYYY-MM-DD format
        payment_method: "cash", // Assuming a default payment method
        remarks: "Agent payout request", // Optional remarks
        receipt_number: `AGT-${Date.now()}`, // Unique receipt number
      })
      if (error) throw error
      fetchData(agentId)
      alert(`Payout request of ₹${pendingAmount.toLocaleString()} submitted!`)
    } catch (e: any) {
      console.error("Payout error:", e)
      const msg = e?.message || e?.error_description || e?.detail || "Unknown error"
      alert(`Failed: ${msg}`)
    } finally {
      setRequesting(false)
    }
  }

  const stats = useMemo(() => {
    const total = payouts.reduce((sum, p) => sum + p.amount_paid, 0)
    const pending = payouts.filter((p) => p.status === "pending").reduce((sum, p) => sum + p.amount_paid, 0)
    const processing = payouts.filter((p) => p.status === "processing").reduce((sum, p) => sum + p.amount_paid, 0)
    const paid = payouts.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.amount_paid, 0)
    return { total, pending, processing, paid }
  }, [payouts])

  const statusConfig: Record<string, { label: string; bg: string; text: string; icon: any }> = {
    pending: { label: "Pending", bg: "bg-amber-50", text: "text-amber-700", icon: Clock },
    processing: { label: "Processing", bg: "bg-blue-50", text: "text-blue-700", icon: Banknote },
    paid: { label: "Paid", bg: "bg-emerald-50", text: "text-emerald-700", icon: CheckCircle },
    rejected: { label: "Rejected", bg: "bg-red-50", text: "text-red-700", icon: XCircle },
  }

  if (!agentId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <MainLayout title="Payouts" isAgent={true} userName={agentName} agentId={agentId}>
      <div className="space-y-6">
        <div>
          <Button variant="outline" size="sm" onClick={() => router.push("/agent/earnings")} className="mb-3 border-slate-200 gap-1.5">
            <ArrowLeft size={16} /> Back to Earnings
          </Button>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Payouts</h1>
              <p className="text-sm text-slate-500 mt-1">Track withdrawal requests and payment history</p>
            </div>
            <Button 
              onClick={handleRequestPayout} 
              disabled={requesting || pendingAmount <= 0} 
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              <Banknote size={18} />
              {requesting ? "Processing..." : `Request Payout (₹${pendingAmount.toLocaleString()})`}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin h-8 w-8 text-slate-400" />
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Payouts", value: stats.total, icon: Banknote, color: "blue" },
                { label: "Pending", value: stats.pending, icon: Clock, color: "amber" },
                { label: "Processing", value: stats.processing, icon: Banknote, color: "blue" },
                { label: "Paid", value: stats.paid, icon: CheckCircle, color: "emerald" },
              ].map((stat) => (
                <Card key={stat.label} className="p-5 bg-white border-slate-100 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">₹{stat.value.toLocaleString()}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-xl bg-${stat.color}-50 flex items-center justify-center`}>
                      <stat.icon size={20} className={`text-${stat.color}-500`} />
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Payout History */}
            <Card className="bg-white border-slate-100 shadow-sm">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Payout History</h3>
                <Button variant="outline" size="sm" className="border-slate-200 gap-1.5">
                  <Download size={14} /> Export
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-slate-500">
                      <th className="py-3 px-5 font-medium">Date</th>
                      <th className="py-3 px-5 font-medium">Description</th>
                      <th className="py-3 px-5 font-medium text-right">Amount</th>
                      <th className="py-3 px-5 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map((payout) => {
                      const config = statusConfig[payout.status] || statusConfig.pending
                      const Icon = config.icon
                      return (
                        <tr key={payout.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                          <td className="py-3.5 px-5 text-slate-700">
                            {new Date(payout.created_at).toLocaleDateString("en-IN")}
                          </td>
                          <td className="py-3.5 px-5 text-slate-900 font-medium">{payout.shop_name}</td>
                          <td className="py-3.5 px-5 text-right font-bold text-slate-900">
                            ₹{payout.amount_paid.toLocaleString()}
                          </td>
                          <td className="py-3.5 px-5">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${config.bg} ${config.text} flex items-center gap-1 w-fit`}>
                              <Icon size={12} /> {config.label}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {payouts.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <Banknote size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No payouts yet</p>
                  <p className="text-sm">Request your first payout to see it here</p>
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </MainLayout>
  )
}