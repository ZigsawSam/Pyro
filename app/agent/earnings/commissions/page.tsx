"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"
import { createAgentClient } from "@/lib/supabase/agent-client"
import { MainLayout } from "@/components/layout/main-layout"
import { CommissionStats } from "@/components/dashboard/agent/CommissionStats"
import { CommissionTrendChart } from "@/components/dashboard/agent/CommissionTrendChart"
import { CommissionBreakdown } from "@/components/dashboard/agent/CommissionBreakdown"
import { TopEarningShop } from "@/components/dashboard/agent/TopEarningShop"
import { CommissionHistoryTable } from "@/components/dashboard/agent/CommissionHistoryTable"
import { Button } from "@/components/ui/button"

interface SaleRecord {
  id: number
  shop_id: number
  shop_name: string
  location: string
  amount: number
  commission_amount: number
  sale_date: string
  notes?: string
  status: "confirmed" | "pending" | "processing" | "rejected"
}

export default function CommissionDetailsPage() {
  const router = useRouter()
  const supabase = createAgentClient()
  const [agentId, setAgentId] = useState<number | null>(null)
  const [agentName, setAgentName] = useState("")
  const [loading, setLoading] = useState(true)
  const [salesRecords, setSalesRecords] = useState<SaleRecord[]>([])
  const [paidSaleIds, setPaidSaleIds] = useState<Set<number>>(new Set())

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
      // Fetch sales with shop info
      const { data: sales, error: salesError } = await supabase
        .from("sales")
        .select(`id, shop_id, amount, commission_amount, sale_date, notes, shops:shop_id (shop_name, city, state)`)
        .eq("agent_id", id)
        .order("sale_date", { ascending: false })

      if (salesError) {
        console.error("Sales query error:", salesError)
      }

      // Fetch payouts to determine which sales are paid
      const { data: payouts } = await supabase
        .from("payouts")
        .select("sale_id, amount_paid, status")
        .eq("agent_id", id)

      // Build set of paid sale IDs
      const paidIds = new Set<number>()
      const processingIds = new Set<number>()
      ;(payouts || []).forEach((p: any) => {
        if (p.status === "paid" || p.amount_paid > 0) {
          paidIds.add(p.sale_id)
        } else if (p.status === "processing") {
          processingIds.add(p.sale_id)
        }
      })

      setPaidSaleIds(paidIds)

      // Format records with derived status
      const formatted = (sales || []).map((s: any) => {
        let status: SaleRecord["status"] = "pending"
        if (paidIds.has(s.id)) status = "confirmed"
        else if (processingIds.has(s.id)) status = "processing"

        return {
          id: s.id,
          shop_id: s.shop_id,
          shop_name: s.shops?.shop_name || "Unknown Shop",
          location: `${s.shops?.city || ""}${s.shops?.state ? `, ${s.shops?.state}` : ""}`,
          amount: Number(s.amount || 0),
          commission_amount: Number(s.commission_amount || 0),
          sale_date: s.sale_date,
          notes: s.notes,
          status,
        }
      })

      console.log("Fetched sales:", formatted.length)
      setSalesRecords(formatted)
    } catch (e) {
      console.error("fetchData error:", e)
    } finally {
      setLoading(false)
    }
  }

  // Computed stats
  const stats = useMemo(() => {
    const total = salesRecords.reduce((sum, r) => sum + r.commission_amount, 0)
    const confirmed = salesRecords.filter((r) => r.status === "confirmed").reduce((sum, r) => sum + r.commission_amount, 0)
    const pending = salesRecords.filter((r) => r.status === "pending").reduce((sum, r) => sum + r.commission_amount, 0)
    const processing = salesRecords.filter((r) => r.status === "processing").reduce((sum, r) => sum + r.commission_amount, 0)
    const rejected = salesRecords.filter((r) => r.status === "rejected").reduce((sum, r) => sum + r.commission_amount, 0)
    return { total, confirmed, pending, processing, rejected }
  }, [salesRecords])

  // Daily commission for trend chart (last 10 days)
  const dailyCommissions = useMemo(() => {
    const days: { date: string; amount: number }[] = []
    for (let i = 9; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split("T")[0]
      const dayTotal = salesRecords
        .filter((s) => s.sale_date?.startsWith(dateStr))
        .reduce((sum, s) => sum + s.commission_amount, 0)
      days.push({ date: dateStr, amount: dayTotal })
    }
    return days
  }, [salesRecords])

  // Top earning shop
  const topShop = useMemo(() => {
    const shopMap = new Map<number, { name: string; location: string; commission: number; sales: number }>()
    salesRecords.forEach((r) => {
      const existing = shopMap.get(r.shop_id)
      if (existing) {
        existing.commission += r.commission_amount
        existing.sales += r.amount
      } else {
        shopMap.set(r.shop_id, {
          name: r.shop_name,
          location: r.location,
          commission: r.commission_amount,
          sales: r.amount,
        })
      }
    })
    let top = { name: "-", location: "-", commission: 0, sales: 0 }
    shopMap.forEach((s) => {
      if (s.commission > top.commission) top = s
    })
    return top
  }, [salesRecords])

  // Table records
  const tableRecords = useMemo(() => {
    return salesRecords.map((r) => ({
      id: r.id,
      date: new Date(r.sale_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
      time: new Date(r.sale_date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      shopName: r.shop_name,
      location: r.location,
      salesAmount: r.amount,
      commission: r.commission_amount,
      rate: r.amount > 0 ? Math.round((r.commission_amount / r.amount) * 100) : 0,
      status: r.status,
      payoutMonth: new Date(r.sale_date).toLocaleDateString("en-IN", { month: "short", year: "numeric" }),
    }))
  }, [salesRecords])

  const shopNames = useMemo(() => {
    return [...new Set(salesRecords.map((r) => r.shop_name))]
  }, [salesRecords])

  const topShopPercentage = stats.total > 0 ? ((topShop.commission / stats.total) * 100).toFixed(1) : "0"

  if (!agentId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <MainLayout title="Commission Details" isAgent={true} userName={agentName} agentId={agentId}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/agent/dashboard")}
            className="mb-3 border-slate-200 gap-1.5"
          >
            <ArrowLeft size={16} /> Back
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">Commission Details</h1>
          <p className="text-sm text-slate-500 mt-1">Welcome back, {agentName}! 👋</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin h-8 w-8 text-slate-400" />
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <CommissionStats
              totalCommission={stats.total}
              confirmed={stats.confirmed}
              pending={stats.pending}
              processing={stats.processing}
              rejected={stats.rejected}
            />

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <CommissionTrendChart data={dailyCommissions} />
              </div>
              <div className="space-y-4">
                <CommissionBreakdown
                  confirmed={stats.confirmed}
                  pending={stats.pending}
                  processing={stats.processing}
                  rejected={stats.rejected}
                  total={stats.total}
                />
                <TopEarningShop
                  shopName={topShop.name}
                  location={topShop.location}
                  commission={topShop.commission}
                  sales={topShop.sales}
                  percentageOfTotal={Number(topShopPercentage)}
                />
              </div>
            </div>

            {/* Commission History Table */}
            <CommissionHistoryTable
              records={tableRecords}
              shops={shopNames}
              onViewDetails={(id) => console.log("View", id)}
            />
          </>
        )}
      </div>
    </MainLayout>
  )
}
