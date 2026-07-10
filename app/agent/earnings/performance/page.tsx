"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Loader2, TrendingUp, Target, Store, ArrowUpRight, ArrowLeft, Trophy } from "lucide-react"
import { createAgentClient } from "@/lib/supabase/agent-client"
import { MainLayout } from "@/components/layout/main-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function PerformancePage() {
  const router = useRouter()
  const supabase = createAgentClient()
  const [agentId, setAgentId] = useState<number | null>(null)
  const [agentName, setAgentName] = useState("")
  const [loading, setLoading] = useState(true)
  const [salesRecords, setSalesRecords] = useState<any[]>([])

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
        .select("shop_id, amount, commission_amount, sale_date, shops:shop_id (shop_name)")
        .eq("agent_id", id)

      setSalesRecords(sales || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const stats = useMemo(() => {
    const totalSales = salesRecords.reduce((sum, r) => sum + Number(r.amount || 0), 0)
    const totalCommission = salesRecords.reduce((sum, r) => sum + Number(r.commission_amount || 0), 0)
    const avgCommission = salesRecords.length > 0 ? totalCommission / salesRecords.length : 0

    // Monthly grouping
    const monthMap = new Map<string, number>()
    salesRecords.forEach((r: any) => {
      const date = new Date(r.sale_date)
      const key = date.toLocaleDateString("en-IN", { month: "short", year: "numeric" })
      monthMap.set(key, (monthMap.get(key) || 0) + Number(r.commission_amount || 0))
    })

    let bestMonth = "-"
    let bestMonthValue = 0
    monthMap.forEach((val, month) => {
      if (val > bestMonthValue) {
        bestMonthValue = val
        bestMonth = month
      }
    })

    // Top shop
    const shopMap = new Map<number, { name: string; commission: number }>()
    salesRecords.forEach((r: any) => {
      const existing = shopMap.get(r.shop_id)
      if (existing) {
        existing.commission += Number(r.commission_amount || 0)
      } else {
        shopMap.set(r.shop_id, {
          name: r.shops?.shop_name || "Unknown",
          commission: Number(r.commission_amount || 0),
        })
      }
    })

    let topShop = { name: "-", commission: 0 }
    shopMap.forEach((s) => {
      if (s.commission > topShop.commission) topShop = s
    })

    return { totalSales, totalCommission, avgCommission, bestMonth, bestMonthValue, topShop }
  }, [salesRecords])

  if (!agentId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <MainLayout title="Performance" isAgent={true} userName={agentName} agentId={agentId}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Button variant="outline" size="sm" onClick={() => router.push("/agent/dashboard")} className="mb-3 border-slate-200 gap-1.5">
            <ArrowLeft size={16} /> Back
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">Performance</h1>
          <p className="text-sm text-slate-500 mt-1">Track your growth and identify opportunities</p>
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
                { label: "Total Sales", value: `₹${stats.totalSales.toLocaleString()}`, icon: TrendingUp, color: "blue", trend: "+18.6%" },
                { label: "Total Commission", value: `₹${stats.totalCommission.toLocaleString()}`, icon: Target, color: "green", trend: "+14.3%" },
                { label: "Avg per Sale", value: `₹${Math.round(stats.avgCommission).toLocaleString()}`, icon: TrendingUp, color: "purple", trend: undefined },
                { label: "Shops Active", value: salesRecords.length > 0 ? `${new Set(salesRecords.map(r => r.shop_id)).size}` : "0", icon: Store, color: "orange", trend: undefined },
              ].map((stat) => (
                <Card key={stat.label} className="p-5 bg-white border-slate-100 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
                      {stat.trend && (
                        <div className="flex items-center gap-1 mt-2 text-sm">
                          <ArrowUpRight size={14} className="text-emerald-500" />
                          <span className="text-emerald-500 font-medium">{stat.trend}</span>
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

            {/* Insights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-5 bg-white border-slate-100 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                    <Trophy size={20} className="text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Highest Earning Shop</p>
                    <p className="text-lg font-bold text-slate-900">{stats.topShop.name}</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-slate-900">₹{stats.topShop.commission.toLocaleString()}</p>
                <p className="text-sm text-slate-500">Total commission earned</p>
              </Card>

              <Card className="p-5 bg-white border-slate-100 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <TrendingUp size={20} className="text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Best Month</p>
                    <p className="text-lg font-bold text-slate-900">{stats.bestMonth}</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-slate-900">₹{stats.bestMonthValue.toLocaleString()}</p>
                <p className="text-sm text-slate-500">Commission earned</p>
              </Card>

              <Card className="p-5 bg-white border-slate-100 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                    <Target size={20} className="text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Monthly Target</p>
                    <p className="text-lg font-bold text-slate-900">₹2,00,000</p>
                  </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 mb-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min(100, (stats.totalSales / 200000) * 100)}%` }} />
                </div>
                <p className="text-sm text-slate-500">
                  {stats.totalSales >= 200000 ? "🎉 Target achieved!" : `₹${(200000 - stats.totalSales).toLocaleString()} left`}
                </p>
              </Card>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  )
}