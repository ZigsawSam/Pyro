"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Store } from "lucide-react"
import { createAgentClient } from "@/lib/supabase/agent-client"
import { MainLayout } from "@/components/layout/main-layout"
import { ShopStats } from "@/components/dashboard/shop/ShopStats"
import { ShopCard } from "@/components/dashboard/shop/ShopCard"
import { ShopSearchFilter } from "@/components/dashboard/shop/ShopSearchFilter"
import { ShopEmptyState } from "@/components/dashboard/shop/ShopEmptyState"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

type TabType = "linked" | "pending" | "rejected" | "discover"

interface Shop {
  id: number
  shop_name: string
  owner_name: string
  phone: string
  city: string
  state: string
  commission_rate?: number
  total_sales?: number
  total_commission?: number
  pending_commission?: number
  status: TabType
  requested_rate?: number
  requested_at?: string
  rejected_at?: string
  reject_reason?: string
}

export default function MyShopsPage() {
  const router = useRouter()
  const supabase = createAgentClient()
  const [agentId, setAgentId] = useState<number | null>(null)
  const [agentName, setAgentName] = useState("")
  const [activeTab, setActiveTab] = useState<TabType>("linked")
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [searching, setSearching] = useState(false)
  const [cityFilter, setCityFilter] = useState("")

  const [linkedShops, setLinkedShops] = useState<Shop[]>([])
  const [pendingShops, setPendingShops] = useState<Shop[]>([])
  const [rejectedShops, setRejectedShops] = useState<Shop[]>([])
  const [discoverShops, setDiscoverShops] = useState<Shop[]>([])

  const [selectedShop, setSelectedShop] = useState<Shop | null>(null)
  const [requestRate, setRequestRate] = useState("")
  const [requestMessage, setRequestMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/auth/agent-login"); return }
      const { data: agent } = await supabase.from("agents").select("id, name").eq("user_id", user.id).single()
      if (!agent) { router.push("/auth/agent-login"); return }
      setAgentId(agent.id)
      setAgentName(agent.name)
      fetchAllData(agent.id)
    }
    checkAuth()
  }, [router, supabase])

  const fetchAllData = async (id: number) => {
    setLoading(true)
    await Promise.all([
      fetchLinkedShops(id),
      fetchPendingShops(id),
      fetchRejectedShops(id),
    ])
    setLoading(false)
  }

  const fetchLinkedShops = async (id: number) => {
    try {
      const { data: links } = await supabase
        .from("shop_agents")
        .select(`shop_id, commission_rate, created_at, shops:shop_id (shop_name, owner_name, phone, city, state)`)
        .eq("agent_id", id)

      const { data: sales } = await supabase
        .from("sales")
        .select("shop_id, amount, commission_amount")
        .eq("agent_id", id)

      const { data: payouts } = await supabase
        .from("payouts")
        .select("shop_id, amount_paid")
        .eq("agent_id", id)

      const shopStats = (sales || []).reduce((acc: any, s: any) => {
        if (!acc[s.shop_id]) acc[s.shop_id] = { total_sales: 0, total_commission: 0 }
        acc[s.shop_id].total_sales += Number(s.amount || 0)
        acc[s.shop_id].total_commission += Number(s.commission_amount || 0)
        return acc
      }, {})

      const paidByShop = (payouts || []).reduce((acc: any, p: any) => {
        acc[p.shop_id] = (acc[p.shop_id] || 0) + Number(p.amount_paid || 0)
        return acc
      }, {})

      const formatted = (links || []).map((link: any) => ({
        id: link.shop_id,
        shop_name: link.shops?.shop_name || "Unknown Shop",
        owner_name: link.shops?.owner_name || "",
        phone: link.shops?.phone || "",
        city: link.shops?.city || "",
        state: link.shops?.state || "",
        commission_rate: link.commission_rate,
        total_sales: shopStats[link.shop_id]?.total_sales || 0,
        total_commission: shopStats[link.shop_id]?.total_commission || 0,
        pending_commission: (shopStats[link.shop_id]?.total_commission || 0) - (paidByShop[link.shop_id] || 0),
        status: "linked" as TabType,
      }))

      setLinkedShops(formatted)
    } catch (e) { console.error(e) }
  }

  const fetchPendingShops = async (id: number) => {
    try {
      const { data: requests } = await supabase
        .from("agent_link_requests")
        .select(`id, shop_id, commission_rate, message, requested_at, shops:shop_id (shop_name, owner_name, phone, city, state)`)
        .eq("agent_id", id)
        .eq("status", "pending")

      const formatted = (requests || []).map((req: any) => ({
        id: req.shop_id,
        shop_name: req.shops?.shop_name || "Unknown Shop",
        owner_name: req.shops?.owner_name || "",
        phone: req.shops?.phone || "",
        city: req.shops?.city || "",
        state: req.shops?.state || "",
        requested_rate: req.commission_rate,
        requested_at: req.requested_at,
        status: "pending" as TabType,
      }))

      setPendingShops(formatted)
    } catch (e) { console.error(e) }
  }

  const fetchRejectedShops = async (id: number) => {
    try {
      const { data: requests } = await supabase
        .from("agent_link_requests")
        .select(`id, shop_id, commission_rate, message, requested_at, shops:shop_id (shop_name, owner_name, phone, city, state)`)
        .eq("agent_id", id)
        .eq("status", "rejected")

      const formatted = (requests || []).map((req: any) => ({
        id: req.shop_id,
        shop_name: req.shops?.shop_name || "Unknown Shop",
        owner_name: req.shops?.owner_name || "",
        phone: req.shops?.phone || "",
        city: req.shops?.city || "",
        state: req.shops?.state || "",
        requested_rate: req.commission_rate,
        rejected_at: req.requested_at,
        reject_reason: req.message || "",
        status: "rejected" as TabType,
      }))

      setRejectedShops(formatted)
    } catch (e) { console.error(e) }
  }

  const handleDiscoverSearch = async () => {
    if (!agentId || !searchQuery.trim()) return
    setSearching(true)
    try {
      const { data: shops } = await supabase
        .from("shops")
        .select("id, shop_name, owner_name, phone, city, state")
        .or(`shop_name.ilike.%${searchQuery}%,owner_name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%`)
        .limit(20)

      const { data: existingLinks } = await supabase
        .from("shop_agents")
        .select("shop_id")
        .eq("agent_id", agentId)

      const { data: pendingRequests } = await supabase
        .from("agent_link_requests")
        .select("shop_id")
        .eq("agent_id", agentId)
        .in("status", ["pending", "rejected"])

      const linkedIds = new Set((existingLinks || []).map((l: any) => l.shop_id))
      const pendingIds = new Set((pendingRequests || []).map((r: any) => r.shop_id))

      const formatted = (shops || [])
        .filter((s: any) => !linkedIds.has(s.id) && !pendingIds.has(s.id))
        .map((s: any) => ({
          id: s.id,
          shop_name: s.shop_name,
          owner_name: s.owner_name,
          phone: s.phone,
          city: s.city,
          state: s.state,
          status: "available" as TabType,
        }))

      setDiscoverShops(formatted)
    } catch (e) { console.error(e) }
    finally { setSearching(false) }
  }

  const handleRequestPartnership = async () => {
    if (!selectedShop || !requestRate || !agentId) return
    setSubmitting(true)
    try {
      const { error } = await supabase
        .from("agent_link_requests")
        .insert({
          agent_id: agentId,
          shop_id: selectedShop.id,
          commission_rate: Number(requestRate),
          message: requestMessage,
          status: "pending",
          requested_by: "agent",
        })
      if (error) throw error
      setSelectedShop(null)
      setRequestRate("")
      setRequestMessage("")
      if (agentId) fetchPendingShops(agentId)
      setActiveTab("pending")
    } catch (e) {
      console.error(e)
      alert("Failed to send request")
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelRequest = async (shopId: number) => {
    if (!agentId) return
    try {
      await supabase
        .from("agent_link_requests")
        .delete()
        .eq("agent_id", agentId)
        .eq("shop_id", shopId)
        .eq("status", "pending")
      fetchPendingShops(agentId)
    } catch (e) { console.error(e) }
  }

  const handleRequestAgain = (shopId: number) => {
    const shop = rejectedShops.find((s) => s.id === shopId)
    if (shop) {
      setSelectedShop(shop)
      setRequestRate(shop.requested_rate?.toString() || "")
    }
  }

  const getCurrentShops = () => {
    switch (activeTab) {
      case "linked": return linkedShops
      case "pending": return pendingShops
      case "rejected": return rejectedShops
      case "discover": return discoverShops
    }
  }

  const allCities = useCallback(() => {
    const cities = new Set<string>()
    linkedShops.forEach((s) => s.city && cities.add(s.city))
    pendingShops.forEach((s) => s.city && cities.add(s.city))
    rejectedShops.forEach((s) => s.city && cities.add(s.city))
    return Array.from(cities).sort()
  }, [linkedShops, pendingShops, rejectedShops])()

  const filteredShops = getCurrentShops().filter((shop) => {
    if (!cityFilter) return true
    return shop.city === cityFilter
  })

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: "linked", label: "Linked Shops", count: linkedShops.length },
    { key: "pending", label: "Pending", count: pendingShops.length },
    { key: "rejected", label: "Rejected", count: rejectedShops.length },
    { key: "discover", label: "Discover Shops", count: discoverShops.length },
  ]

  if (!agentId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <MainLayout title="My Shops" isAgent={true} userName={agentName} agentId={agentId}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Store className="h-6 w-6" /> My Shops
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage your shop relationships</p>
        </div>

        {/* Stats */}
        <ShopStats
          linkedCount={linkedShops.length}
          pendingCount={pendingShops.length}
          rejectedCount={rejectedShops.length}
          availableCount={discoverShops.length}
        />

        {/* Tabs */}
        <div className="border-b border-slate-200">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors relative ${
                  activeTab === tab.key
                    ? "text-blue-600 bg-blue-50"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.key ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                  }`}>
                    {tab.count}
                  </span>
                )}
                {activeTab === tab.key && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Search & Filters */}
        {activeTab === "discover" && (
          <ShopSearchFilter
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSearch={handleDiscoverSearch}
            searching={searching}
            cityFilter={cityFilter}
            onCityFilterChange={setCityFilter}
            cities={allCities}
          />
        )}

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin h-8 w-8 text-slate-400" />
          </div>
        ) : filteredShops.length === 0 ? (
          <ShopEmptyState
            tab={activeTab}
            onAction={() => {
              if (activeTab === "linked") setActiveTab("discover")
              if (activeTab === "discover") {
                setSearchQuery("")
                setCityFilter("")
                setDiscoverShops([])
              }
            }}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredShops.map((shop) => (
              <ShopCard
                key={`${activeTab}-${shop.id}`}
                shopId={shop.id}
                name={shop.shop_name}
                location={`${shop.city}${shop.state ? `, ${shop.state}` : ""}`}
                ownerName={shop.owner_name}
                phone={shop.phone}
                commissionRate={shop.commission_rate}
                requestedRate={shop.requested_rate}
                totalSales={shop.total_sales}
                totalCommission={shop.total_commission}
                pendingCommission={shop.pending_commission}
                status={shop.status}
                rejectedAt={shop.rejected_at}
                rejectReason={shop.reject_reason}
                requestedAt={shop.requested_at}
                onViewDetails={(id) => router.push(`/agent/shops/${id}`)}
                onCancelRequest={handleCancelRequest}
                onRequestAgain={handleRequestAgain}
                onRequestPartnership={(s) => setSelectedShop(s)}
              />
            ))}
          </div>
        )}

        {/* Request Dialog */}
        <Dialog open={!!selectedShop} onOpenChange={() => setSelectedShop(null)}>
          <DialogContent className="bg-white border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-slate-900">
                Request Partnership with {selectedShop?.shop_name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Commission Rate You Want (%)</label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="5.0"
                  value={requestRate}
                  onChange={(e) => setRequestRate(e.target.value)}
                  className="border-slate-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Message (optional)</label>
                <Input
                  placeholder="Introduce yourself..."
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  className="border-slate-200"
                />
              </div>
              <Button
                onClick={handleRequestPartnership}
                disabled={submitting || !requestRate}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {submitting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                Send Request
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  )
}