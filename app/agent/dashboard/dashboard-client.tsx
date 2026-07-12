"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Loader2, Store, Clock, CheckCircle, XCircle, Search, ArrowRight, Wallet,
  TrendingUp, Receipt, Filter, ShoppingBag, Building2, ArrowUpRight, Minus,
  BarChart3, Percent, Target, Activity
} from "lucide-react"
import { createAgentClient } from "@/lib/supabase/agent-client"
import { MainLayout } from "@/components/layout/main-layout"

interface Shop {
  id: number
  name: string
  owner_name: string
  phone: string
  location: string
  commission_rate?: number
  connection_status: "available" | "pending" | "linked"
  requested_rate?: number
  request_id?: number
}

interface Invitation {
  id: number
  shop_id: number
  shop_name: string
  shop_location: string
  commission_rate: number
  message?: string
  requested_by: string
  status?: string
  _source?: "agent_requests" | "agent_link_requests"
  isReceived?: boolean
}

interface LinkedShop {
  shop_id: number
  shop_name: string
  commission_rate: number
  total_sales: number
  total_commission: number
  pending_commission: number
}

interface SaleRecord {
  id: number
  shop_id: number
  shop_name: string
  amount: number
  commission_amount: number
  sale_date: string
  notes: string
}

interface ActivityItem {
  id: number
  type: "onboarded" | "commission" | "payout" | "sale"
  title: string
  description: string
  created_at: string
  status?: string
}

interface DailySales {
  date: string
  amount: number
}

interface AgentDashboardPageProps {
  user?: any
  agentId?: string
}

export function AgentDashboardPage({ user, agentId: agentIdProp }: AgentDashboardPageProps) {
  const router = useRouter()
  const supabase = createAgentClient()

  const agentId = agentIdProp ? parseInt(agentIdProp, 10) : null

  const [agentName, setAgentName] = useState("")
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [linkedShops, setLinkedShops] = useState<LinkedShop[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Shop[]>([])
  const [searching, setSearching] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null)
  const [requestRate, setRequestRate] = useState("")
  const [requestMessage, setRequestMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [processingInvite, setProcessingInvite] = useState<number | null>(null)

  const [salesRecords, setSalesRecords] = useState<SaleRecord[]>([])
  const [salesLoading, setSalesLoading] = useState(false)
  const [salesFilterShop, setSalesFilterShop] = useState<number | "all">("all")
  const [salesDateFrom, setSalesDateFrom] = useState("")
  const [salesDateTo, setSalesDateTo] = useState("")
  const [showSalesSection, setShowSalesSection] = useState(false)

  // Stats
  const [totalSales, setTotalSales] = useState(0)
  const [totalCommission, setTotalCommission] = useState(0)
  const [totalPayouts, setTotalPayouts] = useState(0)
  const [shopsCount, setShopsCount] = useState(0)

  // Dynamic data states
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([])
  const [dailySales, setDailySales] = useState<DailySales[]>([])
  const [prevPeriodSales, setPrevPeriodSales] = useState(0)
  const [prevPeriodCommission, setPrevPeriodCommission] = useState(0)
  const [newShopsThisMonth, setNewShopsThisMonth] = useState(0)
  const [prevPeriodPayouts, setPrevPeriodPayouts] = useState(0)
  const [monthlyTarget, setMonthlyTarget] = useState(200000)
  const [monthlyAchieved, setMonthlyAchieved] = useState(0)

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

    // 1. Fetch received invitations
    let receivedInvitations: any[] = []
    try {
      const { data, error } = await supabase
        .from("agent_requests")
        .select(`id, shop_id, commission_rate, message, requested_by, status, requested_at`)
        .eq("agent_id", id)
        .eq("status", "pending")
      if (!error) receivedInvitations = data || []
    } catch (e) { console.error(e) }

    // 2. Fetch sent requests
    let sentRequests: any[] = []
    try {
      const { data, error } = await supabase
        .from("agent_link_requests")
        .select(`id, shop_id, commission_rate, message, requested_by, status, requested_at`)
        .eq("agent_id", id)
      if (!error) sentRequests = data || []
    } catch (e) { console.error(e) }

    // 3. Fetch shop names
    const allShopIds = [...new Set([
      ...receivedInvitations.map((r: any) => r.shop_id),
      ...sentRequests.map((s: any) => s.shop_id)
    ])]

    let shopMap: Record<number, any> = {}
    if (allShopIds.length > 0) {
      try {
        const { data } = await supabase
          .from("shops")
          .select("id, shop_name, city, state")
          .in("id", allShopIds)
        shopMap = (data || []).reduce((acc: any, s: any) => { acc[s.id] = s; return acc }, {})
      } catch (e) { console.error(e) }
    }

    // 4. Merge invitations
    const formattedInvitations = [
      ...receivedInvitations.map((inv: any) => ({
        id: inv.id, shop_id: inv.shop_id,
        shop_name: shopMap[inv.shop_id]?.shop_name || "Unknown Shop",
        shop_location: `${shopMap[inv.shop_id]?.city || ""}, ${shopMap[inv.shop_id]?.state || ""}`,
        commission_rate: inv.commission_rate, message: inv.message,
        requested_by: inv.requested_by, status: inv.status,
        _source: "agent_requests" as const, isReceived: true,
      })),
      ...sentRequests.map((s: any) => ({
        id: s.id, shop_id: s.shop_id,
        shop_name: shopMap[s.shop_id]?.shop_name || "Unknown Shop",
        shop_location: `${shopMap[s.shop_id]?.city || ""}, ${shopMap[s.shop_id]?.state || ""}`,
        commission_rate: s.commission_rate, message: s.message,
        requested_by: s.requested_by, status: s.status,
        _source: "agent_link_requests" as const, isReceived: false,
      }))
    ]

    // 5. Fetch linked shops
    let linkedShopsData: any[] = []
    try {
      const { data, error } = await supabase
        .from("shop_agents")
        .select(`shop_id, commission_rate, shops:shop_id (shop_name)`)
        .eq("agent_id", id)
      if (!error) linkedShopsData = data || []
    } catch (e) { console.error(e) }

    // 6. Fetch all sales for stats
    let salesData: any[] = []
    try {
      const { data, error } = await supabase
        .from("sales")
        .select("shop_id, amount, commission_amount, sale_date")
        .eq("agent_id", id)
      if (!error) salesData = data || []
    } catch (e) { console.error(e) }

    // 7. Fetch payouts
    let payouts: any[] = []
    try {
      const { data, error } = await supabase
        .from("payouts")
        .select("shop_id, amount_paid, created_at")
        .eq("agent_id", id)
      if (!error) payouts = data || []
    } catch (e) { console.error(e) }

    // Calculate current period stats
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    const currentMonthSales = salesData.filter((s: any) => new Date(s.sale_date) >= currentMonthStart)
    const prevMonthSales = salesData.filter((s: any) => {
      const d = new Date(s.sale_date)
      return d >= prevMonthStart && d <= prevMonthEnd
    })

    const totalSalesAmt = currentMonthSales.reduce((sum, s) => sum + Number(s.amount || 0), 0)
    const totalCommAmt = currentMonthSales.reduce((sum, s) => sum + Number(s.commission_amount || 0), 0)
    const totalPayoutAmt = payouts
      .filter((p: any) => new Date(p.created_at) >= currentMonthStart)
      .reduce((sum, p) => sum + Number(p.amount_paid || 0), 0)
    const prevPayoutAmt = payouts
      .filter((p: any) => {
        const d = new Date(p.created_at)
        return d >= prevMonthStart && d <= prevMonthEnd
      })
      .reduce((sum, p) => sum + Number(p.amount_paid || 0), 0)

    const prevSalesAmt = prevMonthSales.reduce((sum, s) => sum + Number(s.amount || 0), 0)
    const prevCommAmt = prevMonthSales.reduce((sum, s) => sum + Number(s.commission_amount || 0), 0)

    // New shops this month
    const newShopsCount = linkedShopsData.filter((l: any) => {
      const created = l.created_at ? new Date(l.created_at) : null
      return created && created >= currentMonthStart
    }).length

    // Daily sales for chart (last 10 days)
    const last10Days: DailySales[] = []
    for (let i = 9; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split("T")[0]
      const daySales = salesData
        .filter((s: any) => s.sale_date?.startsWith(dateStr))
        .reduce((sum, s) => sum + Number(s.amount || 0), 0)
      last10Days.push({ date: dateStr, amount: daySales })
    }

    // Monthly target & achieved
    const monthAchieved = totalSalesAmt
    const target = 200000 // Can be fetched from agent settings if available

    // Recent activity from actual data
    const activityItems: ActivityItem[] = []

    // Recent shop links
    linkedShopsData.slice(-3).forEach((link: any, idx: number) => {
      activityItems.push({
        id: idx,
        type: "onboarded",
        title: "Shop Onboarded",
        description: `New shop "${link.shops?.shop_name || "Unknown"}" has been onboarded`,
        created_at: link.created_at || new Date().toISOString(),
        status: "Completed"
      })
    })

    // Recent sales
    currentMonthSales.slice(-3).forEach((sale: any, idx: number) => {
      const shopName = linkedShopsData.find((l: any) => l.shop_id === sale.shop_id)?.shops?.shop_name || "Unknown Shop"
      activityItems.push({
        id: 100 + idx,
        type: "commission",
        title: "Commission Confirmed",
        description: `₹${Number(sale.commission_amount || 0).toLocaleString()} commission from ${shopName}`,
        created_at: sale.sale_date,
        status: "Confirmed"
      })
    })

    // Recent payouts
    payouts.slice(-3).forEach((payout: any, idx: number) => {
      activityItems.push({
        id: 200 + idx,
        type: "payout",
        title: "Payout Initiated",
        description: `Payout of ₹${Number(payout.amount_paid || 0).toLocaleString()} has been initiated`,
        created_at: payout.created_at,
        status: "Processing"
      })
    })

    // Sort by date descending and take top 5
    activityItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    const topActivity = activityItems.slice(0, 5)

    setTotalSales(totalSalesAmt)
    setTotalCommission(totalCommAmt)
    setTotalPayouts(totalPayoutAmt)
    setShopsCount(linkedShopsData.length)
    setPrevPeriodSales(prevSalesAmt)
    setPrevPeriodCommission(prevCommAmt)
    setNewShopsThisMonth(newShopsCount)
    setPrevPeriodPayouts(prevPayoutAmt)
    setDailySales(last10Days)
    setMonthlyAchieved(monthAchieved)
    setMonthlyTarget(target)
    setRecentActivity(topActivity)

    const shopStats = salesData.reduce((acc: any, sale: any) => {
      if (!acc[sale.shop_id]) acc[sale.shop_id] = { total_sales: 0, total_commission: 0 }
      acc[sale.shop_id].total_sales += Number(sale.amount || 0)
      acc[sale.shop_id].total_commission += Number(sale.commission_amount || 0)
      return acc
    }, {})

    const paidByShop = payouts.reduce((acc: any, p: any) => {
      acc[p.shop_id] = (acc[p.shop_id] || 0) + Number(p.amount_paid || 0)
      return acc
    }, {})

    const formattedLinkedShops = linkedShopsData.map((link: any) => ({
      shop_id: link.shop_id,
      shop_name: link.shops?.shop_name || "Unknown Shop",
      commission_rate: link.commission_rate,
      total_sales: shopStats[link.shop_id]?.total_sales || 0,
      total_commission: shopStats[link.shop_id]?.total_commission || 0,
      pending_commission: (shopStats[link.shop_id]?.total_commission || 0) - (paidByShop[link.shop_id] || 0),
    }))

    setInvitations(formattedInvitations)
    setLinkedShops(formattedLinkedShops)
    setLoading(false)
  }

  const fetchSales = async () => {
    if (!agentId) return
    setSalesLoading(true)
    try {
      let query = supabase
        .from("sales")
        .select(`id, shop_id, amount, commission_amount, sale_date, notes`)
        .eq("agent_id", agentId)

      if (salesFilterShop !== "all") query = query.eq("shop_id", salesFilterShop)
      if (salesDateFrom) query = query.gte("sale_date", salesDateFrom)
      if (salesDateTo) query = query.lte("sale_date", salesDateTo)

      const { data: salesData, error } = await query.order("sale_date", { ascending: false })
      if (error) throw error

      const shopIds = [...new Set((salesData || []).map((s: any) => s.shop_id))]
      let shopMap: Record<number, string> = {}
      if (shopIds.length > 0) {
        const { data: shopsData } = await supabase
          .from("shops")
          .select("id, shop_name")
          .in("id", shopIds)
        shopMap = (shopsData || []).reduce((acc: any, s: any) => { acc[s.id] = s.shop_name; return acc }, {})
      }

      const formattedSales = (salesData || []).map((sale: any) => ({
        id: sale.id, shop_id: sale.shop_id,
        shop_name: shopMap[sale.shop_id] || "Unknown Shop",
        amount: sale.amount, commission_amount: sale.commission_amount,
        sale_date: sale.sale_date, notes: sale.notes,
      }))

      setSalesRecords(formattedSales)
    } catch (e) {
      console.error("fetchSales error:", e)
      setSalesRecords([])
    } finally {
      setSalesLoading(false)
    }
  }

  useEffect(() => {
    if (showSalesSection && agentId) fetchSales()
  }, [showSalesSection, salesFilterShop, salesDateFrom, salesDateTo, agentId])

  // Computed stats
  const salesGrowth = useMemo(() => {
    if (prevPeriodSales === 0) return totalSales > 0 ? 100 : 0
    return Number((((totalSales - prevPeriodSales) / prevPeriodSales) * 100).toFixed(1))
  }, [totalSales, prevPeriodSales])

  const commissionGrowth = useMemo(() => {
    if (prevPeriodCommission === 0) return totalCommission > 0 ? 100 : 0
    return Number((((totalCommission - prevPeriodCommission) / prevPeriodCommission) * 100).toFixed(1))
  }, [totalCommission, prevPeriodCommission])

  const payoutGrowth = useMemo(() => {
    if (prevPeriodPayouts === 0) return totalPayouts > 0 ? 100 : 0
    return Number((((totalPayouts - prevPeriodPayouts) / prevPeriodPayouts) * 100).toFixed(1))
  }, [totalPayouts, prevPeriodPayouts])

  const monthlyProgress = useMemo(() => {
    if (monthlyTarget === 0) return 0
    return Math.min(100, Math.round((monthlyAchieved / monthlyTarget) * 100))
  }, [monthlyAchieved, monthlyTarget])

  const maxDailySale = useMemo(() => {
    return Math.max(...dailySales.map(d => d.amount), 1)
  }, [dailySales])

  const handleSearch = async () => {
    if (!searchQuery.trim() || !agentId) return
    setSearching(true)
    try {
      const { data: shops, error } = await supabase
        .from("shops")
        .select("id, shop_name, owner_name, phone, city, state")
        .or(`shop_name.ilike.%${searchQuery}%,owner_name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
        .limit(20)

      if (error) throw error

      const { data: existingLinks } = await supabase
        .from("shop_agents")
        .select("shop_id")
        .eq("agent_id", agentId)

      const { data: pendingRequests } = await supabase
        .from("agent_link_requests")
        .select("shop_id, commission_rate, id")
        .eq("agent_id", agentId)
        .eq("status", "pending")

      const linkedShopIds = new Set((existingLinks || []).map((l: any) => l.shop_id))
      const pendingMap = new Map((pendingRequests || []).map((r: any) => [r.shop_id, r]))

      const formattedResults = (shops || []).map((shop: any) => {
        if (linkedShopIds.has(shop.id)) {
          return { ...shop, name: shop.shop_name, location: `${shop.city}, ${shop.state}`, connection_status: "linked" as const }
        }
        const pending = pendingMap.get(shop.id)
        if (pending) {
          return { ...shop, name: shop.shop_name, location: `${shop.city}, ${shop.state}`, connection_status: "pending" as const, requested_rate: pending.commission_rate, request_id: pending.id }
        }
        return { ...shop, name: shop.shop_name, location: `${shop.city}, ${shop.state}`, connection_status: "available" as const }
      })

      setSearchResults(formattedResults)
    } catch (e) { console.error(e) }
    finally { setSearching(false) }
  }

  const handleRequest = async () => {
    if (!selectedShop || !requestRate || !agentId) return
    setSubmitting(true)
    try {
      const { data: existing } = await supabase
        .from("agent_link_requests")
        .select("id, status")
        .eq("agent_id", agentId)
        .eq("shop_id", selectedShop.id)
        .maybeSingle()

      if (existing?.status === "pending") {
        alert("You already have a pending request for this shop")
        setSubmitting(false)
        return
      }
      if (existing?.status === "rejected") {
        await supabase.from("agent_link_requests").delete().eq("id", existing.id)
      }

      const { error } = await supabase
        .from("agent_link_requests")
        .insert({
          agent_id: agentId, shop_id: selectedShop.id,
          commission_rate: Number(requestRate), message: requestMessage,
          status: "pending", requested_by: "agent",
        })

      if (error) throw error

      setSelectedShop(null)
      setRequestRate("")
      setRequestMessage("")
      handleSearch()
      alert("Request sent successfully!")
    } catch (e) {
      console.error("handleRequest error:", e)
      alert("Failed to send request")
    } finally {
      setSubmitting(false)
    }
  }

  const handleInvitation = async (inviteId: number, action: "accept" | "reject") => {
    setProcessingInvite(inviteId)
    try {
      const invitation = invitations.find((i) => i.id === inviteId)
      if (!invitation) { alert("Invitation not found"); setProcessingInvite(null); return }
      if (invitation.requested_by === "agent") {
        alert("You cannot accept or reject your own sent request.")
        setProcessingInvite(null); return
      }

      const table = invitation._source || "agent_requests"
      const { error } = await supabase
        .from(table)
        .update({ status: action === "accept" ? "approved" : "rejected" })
        .eq("id", inviteId)

      if (error) throw new Error(`Update failed: ${error.message}`)

      if (action === "accept") {
        const { data: req } = await supabase
          .from(table)
          .select("shop_id, agent_id, commission_rate")
          .eq("id", inviteId)
          .single()

        if (req) {
          await supabase.from("shop_agents").insert({
            shop_id: req.shop_id, agent_id: req.agent_id,
            commission_rate: req.commission_rate,
          })
        }
      }

      if (agentId) fetchData(agentId)
    } catch (e: any) {
      console.error("handleInvitation error:", e)
      alert(e.message || "Action failed")
    } finally {
      setProcessingInvite(null)
    }
  }

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins} min ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`
    return date.toLocaleDateString()
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "onboarded": return { icon: Store, color: "text-green-500", bg: "bg-green-50", badgeColor: "bg-green-100 text-green-700" }
      case "commission": return { icon: TrendingUp, color: "text-blue-500", bg: "bg-blue-50", badgeColor: "bg-blue-100 text-blue-700" }
      case "payout": return { icon: Wallet, color: "text-amber-500", bg: "bg-amber-50", badgeColor: "bg-amber-100 text-amber-700" }
      case "sale": return { icon: ShoppingBag, color: "text-purple-500", bg: "bg-purple-50", badgeColor: "bg-purple-100 text-purple-700" }
      default: return { icon: Activity, color: "text-slate-500", bg: "bg-slate-50", badgeColor: "bg-slate-100 text-slate-700" }
    }
  }

  if (!agentId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <MainLayout title="Agent Dashboard" isAgent={true} userName={agentName} agentId={agentId}>
      <div className="space-y-6">
        {/* Stats Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5 bg-white border-slate-200 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Total Sales</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">₹{totalSales.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-2 text-sm">
                  {salesGrowth >= 0 ? (
                    <ArrowUpRight size={14} className="text-emerald-500" />
                  ) : (
                    <ArrowUpRight size={14} className="text-red-500 rotate-90" />
                  )}
                  <span className={`font-medium ${salesGrowth >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                    {Math.abs(salesGrowth)}%
                  </span>
                  <span className="text-slate-400">vs last month</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <ShoppingBag size={20} className="text-blue-500" />
              </div>
            </div>
          </Card>

          <Card className="p-5 bg-white border-slate-200 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Total Commission</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">₹{totalCommission.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-2 text-sm">
                  {commissionGrowth >= 0 ? (
                    <ArrowUpRight size={14} className="text-emerald-500" />
                  ) : (
                    <ArrowUpRight size={14} className="text-red-500 rotate-90" />
                  )}
                  <span className={`font-medium ${commissionGrowth >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                    {Math.abs(commissionGrowth)}%
                  </span>
                  <span className="text-slate-400">vs last month</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                <Percent size={20} className="text-green-500" />
              </div>
            </div>
          </Card>

          <Card className="p-5 bg-white border-slate-200 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Shops Onboarded</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{shopsCount}</p>
                <div className="flex items-center gap-1 mt-2 text-sm">
                  {newShopsThisMonth > 0 ? (
                    <>
                      <ArrowUpRight size={14} className="text-emerald-500" />
                      <span className="text-emerald-500 font-medium">{newShopsThisMonth}</span>
                      <span className="text-slate-400">new this month</span>
                    </>
                  ) : (
                    <>
                      <Minus size={14} className="text-slate-400" />
                      <span className="text-slate-400">No new shops this month</span>
                    </>
                  )}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                <Building2 size={20} className="text-purple-500" />
              </div>
            </div>
          </Card>

          <Card className="p-5 bg-white border-slate-200 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Payouts Received</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">₹{totalPayouts.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-2 text-sm">
                  {payoutGrowth === 0 ? (
                    <>
                      <Minus size={14} className="text-slate-400" />
                      <span className="text-slate-400">Same as last month</span>
                    </>
                  ) : (
                    <>
                      <ArrowUpRight size={14} className={payoutGrowth >= 0 ? "text-emerald-500" : "text-red-500 rotate-90"} />
                      <span className={`font-medium ${payoutGrowth >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                        {Math.abs(payoutGrowth)}%
                      </span>
                      <span className="text-slate-400">vs last month</span>
                    </>
                  )}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                <Wallet size={20} className="text-orange-500" />
              </div>
            </div>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Sales Overview */}
          <Card className="p-5 bg-white border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={16} className="text-blue-500" />
              <h3 className="font-semibold text-slate-900">Sales Overview</h3>
            </div>
            {dailySales.length > 0 && dailySales.some(d => d.amount > 0) ? (
              <div className="h-40 flex items-end justify-between gap-2 px-2">
                {dailySales.map((day, i) => {
                  const height = maxDailySale > 0 ? (day.amount / maxDailySale) * 100 : 0
                  const isToday = i === dailySales.length - 1
                  const dateLabel = new Date(day.date).getDate()
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full max-w-[28px] rounded-t-sm transition-all"
                        style={{
                          height: `${Math.max(height, 4)}px`,
                          background: isToday ? '#3b82f6' : '#dbeafe'
                        }}
                      />
                      <span className="text-[9px] text-slate-400">{dateLabel}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-slate-400 text-sm">
                No sales data yet
              </div>
            )}
          </Card>

          {/* Commission Trend */}
          <Card className="p-5 bg-white border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-blue-500" />
                <h3 className="font-semibold text-slate-900">Commission Trend</h3>
              </div>
              <span className="text-xs text-slate-400">This Month</span>
            </div>
            <div className="flex items-center justify-center">
              <div className="relative w-28 h-28">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#e2e8f0" strokeWidth="10" />
                  {totalCommission > 0 ? (
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#3b82f6" strokeWidth="10"
                      strokeDasharray={`${Math.min(totalCommission / 5000, 1) * 239} 239`} strokeLinecap="round" />
                  ) : null}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold text-slate-900">₹{totalCommission.toLocaleString()}</span>
                  <span className="text-[10px] text-slate-400">Total</span>
                </div>
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              {linkedShops.length > 0 ? linkedShops.slice(0, 4).map((shop) => {
                const pct = totalCommission > 0 ? ((shop.total_commission / totalCommission) * 100).toFixed(1) : "0"
                const colors = ["bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-red-500"]
                const idx = linkedShops.indexOf(shop) % 4
                return (
                  <div key={shop.shop_id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${colors[idx]}`} />
                      <span className="text-slate-600 truncate max-w-[120px]">{shop.shop_name}</span>
                    </div>
                    <span className="font-medium text-slate-900">₹{shop.total_commission.toLocaleString()} ({pct}%)</span>
                  </div>
                )
              }) : (
                <p className="text-xs text-slate-400 text-center">No commission data yet</p>
              )}
            </div>
          </Card>

          {/* Performance */}
          <Card className="p-5 bg-white border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target size={16} className="text-blue-500" />
                <h3 className="font-semibold text-slate-900">Performance This Month</h3>
              </div>
              {monthlyProgress >= 80 ? (
                <span className="text-[10px] px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">Great going!</span>
              ) : monthlyProgress >= 50 ? (
                <span className="text-[10px] px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">Keep pushing!</span>
              ) : (
                <span className="text-[10px] px-2 py-1 bg-amber-100 text-amber-700 rounded-full font-medium">Get started!</span>
              )}
            </div>
            <div className="flex items-center justify-center py-1">
              <div className="relative w-24 h-24">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#3b82f6" strokeWidth="8"
                    strokeDasharray={`${(monthlyProgress / 100) * 251} 251`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-slate-900">{monthlyProgress}%</span>
                  <span className="text-[9px] text-slate-400">of monthly target</span>
                </div>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Target</span>
                <span className="font-semibold text-slate-900">₹{monthlyTarget.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Achieved</span>
                <span className="font-semibold text-slate-900">₹{monthlyAchieved.toLocaleString()}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${monthlyProgress}%` }} />
              </div>
              <p className="text-[11px] text-slate-500">
                {monthlyAchieved >= monthlyTarget
                  ? "Target achieved!"
                  : `₹${(monthlyTarget - monthlyAchieved).toLocaleString()} left to reach your target`}
              </p>
            </div>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Recent Activity */}
          <Card className="p-5 bg-white border-slate-200 shadow-sm">
            <h3 className="font-semibold text-slate-900 mb-4">Recent Activity</h3>
            {recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((item) => {
                  const { icon: Icon, color, bg, badgeColor } = getActivityIcon(item.type)
                  return (
                    <div key={item.id} className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                        <Icon size={14} className={color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900">{item.title}</p>
                        <p className="text-xs text-slate-500">{item.description}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-slate-400">{formatRelativeTime(item.created_at)}</p>
                        {item.status && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${badgeColor}`}>{item.status}</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center text-slate-400 py-8 text-sm">
                <Activity size={24} className="mx-auto mb-2 opacity-50" />
                No recent activity yet
              </div>
            )}
          </Card>

          {/* Top Performing Shops */}
          <Card className="p-5 bg-white border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Top Performing Shops</h3>
              <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">View All</button>
            </div>
            {linkedShops.length > 0 ? (
              <div className="space-y-4">
                {linkedShops
                  .sort((a, b) => b.total_sales - a.total_sales)
                  .slice(0, 3)
                  .map((shop, i) => (
                    <div key={shop.shop_id} className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        i === 0 ? 'bg-amber-100 text-amber-600' : i === 1 ? 'bg-slate-100 text-slate-600' : 'bg-orange-100 text-orange-600'
                      }`}>{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900">{shop.shop_name}</p>
                        <p className="text-xs text-slate-500">{shop.commission_rate}% commission rate</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900">₹{shop.total_sales.toLocaleString()}</p>
                        <p className="text-xs text-emerald-500 flex items-center justify-end gap-0.5">
                          <ArrowUpRight size={10} /> {shop.total_commission > 0 ? `₹${shop.total_commission.toLocaleString()}` : "No sales"}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center text-slate-400 py-8 text-sm">
                <Store size={24} className="mx-auto mb-2 opacity-50" />
                No shops linked yet. Onboard shops to see performance.
              </div>
            )}
          </Card>

          {/* Quick Actions */}
          <Card className="p-5 bg-white border-slate-200 shadow-sm">
            <h3 className="font-semibold text-slate-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Search, color: 'blue', title: 'Find Shops', desc: 'Search & onboard' },
                { icon: Receipt, color: 'green', title: 'Sales Statement', desc: 'View your sales' },
                { icon: TrendingUp, color: 'purple', title: 'Commission Details', desc: 'Track commissions' },
                { icon: Wallet, color: 'orange', title: 'Request Payout', desc: 'Withdraw earnings' },
              ].map((action, i) => (
                <button key={i} className={`p-4 rounded-xl border border-slate-200 hover:border-${action.color}-300 hover:bg-${action.color}-50 transition-all text-left group`}>
                  <action.icon size={20} className={`text-${action.color}-500 mb-2`} />
                  <p className="text-sm font-medium text-slate-900">{action.title}</p>
                  <p className="text-xs text-slate-500">{action.desc}</p>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Footer Banner */}
        <Card className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <TrendingUp size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {monthlyProgress >= 80
                    ? "Keep growing! You are doing great this month."
                    : monthlyProgress >= 50
                    ? "You are halfway there! Keep pushing."
                    : "Start onboarding shops to reach your target!"}
                </p>
                <p className="text-xs text-slate-500">
                  {linkedShops.length > 0
                    ? `You have ${linkedShops.length} shop${linkedShops.length > 1 ? "s" : ""} linked. Onboard more to increase earnings.`
                    : "Onboard shops and increase your sales to earn higher commissions."}
                </p>
              </div>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">
              <Store size={16} className="mr-2" />
              Invite New Shop
              <ArrowRight size={16} className="ml-2" />
            </Button>
          </div>
        </Card>

        {/* My Shops */}
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-slate-900">
            <Store className="h-5 w-5" /> My Shops
          </h2>
          {linkedShops.length === 0 ? (
            <Card className="p-6 text-center text-slate-400 bg-white border-slate-200 shadow-sm">
              You are not linked to any shops yet. Search for shops below or wait for invitations.
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {linkedShops.map((shop) => (
                <Card key={shop.shop_id} className="p-4 bg-white border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{shop.shop_name}</p>
                      <p className="text-sm text-slate-500">Rate: {shop.commission_rate}%</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-amber-600">₹{Number(shop.pending_commission || 0).toLocaleString()}</p>
                      <p className="text-xs text-slate-400">pending</p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> ₹{Number(shop.total_sales || 0).toLocaleString()} sales</span>
                    <span className="flex items-center gap-1"><Wallet className="h-3 w-3" /> ₹{Number(shop.total_commission || 0).toLocaleString()} commission</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Sales Statement */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-900">
              <Receipt className="h-5 w-5" /> Sales Statement
            </h2>
            <Button variant="outline" size="sm" onClick={() => setShowSalesSection(!showSalesSection)} className="border-slate-200">
              {showSalesSection ? "Hide" : "Show"} Statement
            </Button>
          </div>

          {showSalesSection && (
            <Card className="p-4 space-y-4 bg-white border-slate-200 shadow-sm">
              <div className="flex flex-wrap gap-2 items-end">
                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-600">Shop</label>
                  <select
                    value={salesFilterShop}
                    onChange={(e) => setSalesFilterShop(e.target.value === "all" ? "all" : Number(e.target.value))}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  >
                    <option value="all">All Shops</option>
                    {linkedShops.map((shop) => (
                      <option key={shop.shop_id} value={shop.shop_id}>{shop.shop_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-600">From</label>
                  <Input type="date" value={salesDateFrom} onChange={(e) => setSalesDateFrom(e.target.value)} className="w-auto text-sm border-slate-200" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-600">To</label>
                  <Input type="date" value={salesDateTo} onChange={(e) => setSalesDateTo(e.target.value)} className="w-auto text-sm border-slate-200" />
                </div>
                <Button size="sm" onClick={fetchSales} disabled={salesLoading} className="bg-blue-600 hover:bg-blue-700">
                  {salesLoading ? <Loader2 className="animate-spin h-4 w-4" /> : <Filter className="h-4 w-4" />}
                  Apply
                </Button>
              </div>

              <div className="flex gap-6 py-3 border-y border-slate-100">
                <div>
                  <p className="text-xs text-slate-500">Total Sales</p>
                  <p className="text-xl font-bold text-slate-900">₹{totalSales.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Commission</p>
                  <p className="text-xl font-bold text-green-600">₹{totalCommission.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Records</p>
                  <p className="text-xl font-bold text-slate-900">{salesRecords.length}</p>
                </div>
              </div>

              {salesLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
              ) : salesRecords.length === 0 ? (
                <p className="text-center text-slate-400 py-8">No sales records found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-left">
                        <th className="pb-2 font-medium text-slate-600">Date</th>
                        <th className="pb-2 font-medium text-slate-600">Shop</th>
                        <th className="pb-2 font-medium text-slate-600 text-right">Sale Amount</th>
                        <th className="pb-2 font-medium text-slate-600 text-right">Commission</th>
                        <th className="pb-2 font-medium text-slate-600">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesRecords.map((sale) => (
                        <tr key={sale.id} className="border-b border-slate-50">
                          <td className="py-2 text-slate-700">{new Date(sale.sale_date).toLocaleDateString()}</td>
                          <td className="py-2 text-slate-700">{sale.shop_name}</td>
                          <td className="py-2 text-right text-slate-700">₹{Number(sale.amount).toLocaleString()}</td>
                          <td className="py-2 text-right text-green-600">₹{Number(sale.commission_amount).toLocaleString()}</td>
                          <td className="py-2 text-slate-400">{sale.notes || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Pending Invitations */}
        {invitations.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-slate-900">
              <Clock className="h-5 w-5 text-amber-500" /> Requests & Invitations ({invitations.length})
            </h2>
            <div className="space-y-2">
              {invitations.map((inv) => (
                <Card key={`${inv._source}-${inv.id}`} className="p-4 flex items-center justify-between bg-white border-slate-200 shadow-sm">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900">{inv.shop_name}</p>
                      {inv.isReceived ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Received</span>
                      ) : (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Sent by you</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500">{inv.shop_location}</p>
                    <p className="text-sm text-slate-700">Commission: {inv.commission_rate}%</p>
                    {inv.message && <p className="text-sm text-slate-400 italic">&quot;{inv.message}&quot;</p>}
                  </div>
                  <div className="flex gap-2">
                    {inv.status === "pending" ? (
                      inv.isReceived ? (
                        <>
                          <Button variant="outline" size="sm" onClick={() => handleInvitation(inv.id, "reject")} disabled={processingInvite === inv.id} className="border-slate-200">
                            <XCircle className="h-4 w-4 mr-1" /> Decline
                          </Button>
                          <Button size="sm" onClick={() => handleInvitation(inv.id, "accept")} disabled={processingInvite === inv.id} className="bg-blue-600 hover:bg-blue-700">
                            {processingInvite === inv.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                            Accept
                          </Button>
                        </>
                      ) : (
                        <span className="text-sm text-blue-600 flex items-center gap-1">
                          <Clock className="h-4 w-4" /> Waiting for shop
                        </span>
                      )
                    ) : (
                      <span className={`text-sm flex items-center gap-1 ${inv.status === "approved" ? "text-green-600" : "text-red-600"}`}>
                        {inv.status === "approved" ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        {inv.status}
                      </span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Find Shops */}
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-slate-900">
            <Search className="h-5 w-5" /> Find Shops
          </h2>
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Search by shop name, owner name, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1 border-slate-200"
            />
            <Button onClick={handleSearch} disabled={searching || !searchQuery.trim()} className="bg-blue-600 hover:bg-blue-700">
              {searching ? <Loader2 className="animate-spin" /> : <Search className="h-4 w-4" />}
              Search
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((shop) => (
                <Card key={shop.id} className="p-4 flex items-center justify-between bg-white border-slate-200 shadow-sm">
                  <div>
                    <p className="font-medium text-slate-900">{shop.name}</p>
                    <p className="text-sm text-slate-500">Owner: {shop.owner_name} | {shop.phone}</p>
                    <p className="text-sm text-slate-500">{shop.location}</p>
                  </div>
                  {shop.connection_status === "linked" ? (
                    <span className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" /> Linked
                    </span>
                  ) : shop.connection_status === "pending" ? (
                    <span className="text-sm text-amber-600 flex items-center gap-1">
                      <Clock className="h-4 w-4" /> Requested {shop.requested_rate}%
                    </span>
                  ) : (
                    <Button size="sm" onClick={() => setSelectedShop(shop)} className="bg-blue-600 hover:bg-blue-700">
                      Request to Join <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                </Card>
              ))}
            </div>
          )}
          {searchResults.length === 0 && searchQuery && !searching && (
            <p className="text-slate-400 text-center py-4">No shops found.</p>
          )}
        </div>

        {/* Request Dialog */}
        <Dialog open={!!selectedShop} onOpenChange={() => setSelectedShop(null)}>
          <DialogContent className="bg-white border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-slate-900">Request to Join {selectedShop?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Commission Rate You Want (%)</label>
                <Input type="number" step="0.1" placeholder="5.0" value={requestRate} onChange={(e) => setRequestRate(e.target.value)} className="border-slate-200" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Message (optional)</label>
                <Input placeholder="Introduce yourself..." value={requestMessage} onChange={(e) => setRequestMessage(e.target.value)} className="border-slate-200" />
              </div>
              <Button onClick={handleRequest} disabled={submitting || !requestRate} className="w-full bg-blue-600 hover:bg-blue-700">
                {submitting ? <Loader2 className="animate-spin mr-2" /> : null}
                Send Request
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  )
}
