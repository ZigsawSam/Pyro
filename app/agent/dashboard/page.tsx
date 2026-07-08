"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, Store, Clock, CheckCircle, XCircle, Search, ArrowRight, Wallet, TrendingUp, Receipt, Filter } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
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

export default function AgentDashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [agentId, setAgentId] = useState<number | null>(null)
  const [agentName, setAgentName] = useState<string>("")
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

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/agent-login")
        return
      }
      const { data: agent } = await supabase
        .from("agents")
        .select("id, name")
        .eq("user_id", user.id)
        .single()
      
      if (!agent) {
        router.push("/auth/agent-login")
        return
      }
      
      setAgentId(agent.id)
      setAgentName(agent.name)
      fetchData(agent.id)
    }
    checkAuth()
  }, [router, supabase])

  const fetchData = async (id: number) => {
    setLoading(true)
    try {
      // Fetch shop-initiated requests (received by agent)
      const { data: invData, error: invError } = await supabase
        .from("agent_requests")
        .select(`
          id,
          shop_id,
          commission_rate,
          message,
          requested_by,
          status,
          requested_at,
          shops:shop_id (shop_name, city, state)
        `)
        .eq("agent_id", id)
        .eq("status", "pending")

      // Fetch agent-initiated requests (sent by agent)
      const { data: sentData, error: sentError } = await supabase
        .from("agent_link_requests")
        .select(`
          id,
          shop_id,
          commission_rate,
          message,
          requested_by,
          status,
          created_at,
          shops:shop_id (shop_name, city, state)
        `)
        .eq("agent_id", id)

      if (invError) throw invError
      if (sentError) throw sentError

            const formattedInvitations = [
        // Received from shops
        ...(invData || []).map((inv: any) => ({
          id: inv.id,
          shop_id: inv.shop_id,
          shop_name: inv.shops?.shop_name || "Unknown Shop",
          shop_location: `${inv.shops?.city || ""}, ${inv.shops?.state || ""}`,
          commission_rate: inv.commission_rate,
          message: inv.message,
          requested_by: inv.requested_by,
          _source: "agent_requests" as const,
        })),
        // Sent by agent (pending)
        ...(sentData || [])
          .filter((s: any) => s.status === "pending")
          .map((s: any) => ({
            id: s.id,
            shop_id: s.shop_id,
            shop_name: s.shops?.shop_name || "Unknown Shop",
            shop_location: `${s.shops?.city || ""}, ${s.shops?.state || ""}`,
            commission_rate: s.commission_rate,
            message: s.message,
            requested_by: s.requested_by,
            _source: "agent_link_requests" as const,
          }))
      ]

      const { data: shopLinks, error: linksError } = await supabase
        .from("shop_agents")
        .select(`
          shop_id,
          commission_rate,
          shops:shop_id (shop_name)
        `)
        .eq("agent_id", id)

      if (linksError) throw linksError

      const { data: salesData, error: salesError } = await supabase
        .from("sales")
        .select("shop_id, amount, commission_amount")
        .eq("agent_id", id)

      if (salesError) throw salesError

      const shopStats = (salesData || []).reduce((acc: any, sale: any) => {
        if (!acc[sale.shop_id]) {
          acc[sale.shop_id] = { total_sales: 0, total_commission: 0 }
        }
        acc[sale.shop_id].total_sales += Number(sale.amount || 0)
        acc[sale.shop_id].total_commission += Number(sale.commission_amount || 0)
        return acc
      }, {})

      const { data: payouts, error: payoutError } = await supabase
        .from("payouts")
        .select("shop_id, amount_paid")
        .eq("person_id", id)
        .eq("person_type", "agent")

      if (payoutError) throw payoutError

      const paidByShop = (payouts || []).reduce((acc: any, p: any) => {
        acc[p.shop_id] = (acc[p.shop_id] || 0) + Number(p.amount_paid || 0)
        return acc
      }, {})

      const formattedLinkedShops = (shopLinks || []).map((link: any) => ({
        shop_id: link.shop_id,
        shop_name: link.shops?.shop_name || "Unknown Shop",
        commission_rate: link.commission_rate,
        total_sales: shopStats[link.shop_id]?.total_sales || 0,
        total_commission: shopStats[link.shop_id]?.total_commission || 0,
        pending_commission: (shopStats[link.shop_id]?.total_commission || 0) - (paidByShop[link.shop_id] || 0),
      }))

      setInvitations(formattedInvitations)
      setLinkedShops(formattedLinkedShops)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const fetchSales = async () => {
    if (!agentId) return
    setSalesLoading(true)
    try {
      let query = supabase
        .from("sales")
        .select(`
          id,
          shop_id,
          amount,
          commission_amount,
          sale_date,
          notes,
          shops:shop_id (shop_name)
        `)
        .eq("agent_id", agentId)

      if (salesFilterShop !== "all") {
        query = query.eq("shop_id", salesFilterShop)
      }
      if (salesDateFrom) {
        query = query.gte("sale_date", salesDateFrom)
      }
      if (salesDateTo) {
        query = query.lte("sale_date", salesDateTo)
      }

      const { data, error } = await query.order("sale_date", { ascending: false })

      if (error) throw error

      const formattedSales = (data || []).map((sale: any) => ({
        id: sale.id,
        shop_id: sale.shop_id,
        shop_name: sale.shops?.shop_name || "Unknown Shop",
        amount: sale.amount,
        commission_amount: sale.commission_amount,
        sale_date: sale.sale_date,
        notes: sale.notes,
      }))

      setSalesRecords(formattedSales)
    } catch (e) { 
      console.error(e)
      setSalesRecords([])
    } finally { 
      setSalesLoading(false) 
    }
  }

  useEffect(() => {
    if (showSalesSection && agentId) {
      fetchSales()
    }
  }, [showSalesSection, salesFilterShop, salesDateFrom, salesDateTo, agentId])

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
        .select("id")
        .eq("agent_id", agentId)
        .eq("shop_id", selectedShop.id)
        .eq("status", "pending")
        .single()

      if (existing) {
        alert("You already have a pending request for this shop")
        setSubmitting(false)
        return
      }

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
      handleSearch()
      alert("Request sent successfully!")
    } catch (e) { 
      alert("Failed to send request") 
    } finally { 
      setSubmitting(false) 
    }
  }

  const handleInvitation = async (inviteId: number, action: "accept" | "reject") => {
    setProcessingInvite(inviteId)
    try {
      const { error } = await supabase
        .from("agent_requests")
        .update({ status: action === "accept" ? "approved" : "rejected" })
        .eq("id", inviteId)

      if (error) throw error

      if (action === "accept") {
        const { data: req } = await supabase
          .from("agent_requests")
          .select("shop_id, agent_id, commission_rate")
          .eq("id", inviteId)
          .single()

        if (req) {
          await supabase.from("shop_agents").insert({
            shop_id: req.shop_id,
            agent_id: req.agent_id,
            commission_rate: req.commission_rate,
          })
        }
      }

      if (agentId) fetchData(agentId)
    } catch (e) { alert("Action failed") }
    finally { setProcessingInvite(null) }
  }

  const totalSalesAmount = Array.isArray(salesRecords) 
    ? salesRecords.reduce((sum, s) => sum + Number(s.amount || 0), 0) 
    : 0
  const totalCommissionAmount = Array.isArray(salesRecords) 
    ? salesRecords.reduce((sum, s) => sum + Number(s.commission_amount || 0), 0) 
    : 0

  if (!agentId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <MainLayout title="Agent Dashboard" isAgent={true} userName={agentName}>
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* My Linked Shops */}
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Store className="h-5 w-5" /> My Shops
          </h2>
          {linkedShops.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground">
              You are not linked to any shops yet. Search for shops below or wait for invitations.
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {linkedShops.map((shop) => (
                <Card key={shop.shop_id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{shop.shop_name}</p>
                      <p className="text-sm text-muted-foreground">Rate: {shop.commission_rate}%</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-amber-600">₹{Number(shop.pending_commission || 0).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">pending</p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> ₹{Number(shop.total_sales || 0).toLocaleString()} sales</span>
                    <span className="flex items-center gap-1"><Wallet className="h-3 w-3" /> ₹{Number(shop.total_commission || 0).toLocaleString()} commission</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Sales Statement Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Receipt className="h-5 w-5" /> Sales Statement
            </h2>
            <Button variant="outline" size="sm" onClick={() => setShowSalesSection(!showSalesSection)}>
              {showSalesSection ? "Hide" : "Show"} Statement
            </Button>
          </div>
          
          {showSalesSection && (
            <Card className="p-4 space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-2 items-end">
                <div>
                  <label className="block text-xs font-medium mb-1">Shop</label>
                  <select 
                    value={salesFilterShop} 
                    onChange={(e) => setSalesFilterShop(e.target.value === "all" ? "all" : Number(e.target.value))}
                    className="rounded border border-border bg-card px-3 py-2 text-sm"
                  >
                    <option value="all">All Shops</option>
                    {linkedShops.map((shop) => (
                      <option key={shop.shop_id} value={shop.shop_id}>{shop.shop_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">From</label>
                  <Input 
                    type="date" 
                    value={salesDateFrom} 
                    onChange={(e) => setSalesDateFrom(e.target.value)}
                    className="w-auto text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">To</label>
                  <Input 
                    type="date" 
                    value={salesDateTo} 
                    onChange={(e) => setSalesDateTo(e.target.value)}
                    className="w-auto text-sm"
                  />
                </div>
                <Button size="sm" onClick={fetchSales} disabled={salesLoading}>
                  {salesLoading ? <Loader2 className="animate-spin h-4 w-4" /> : <Filter className="h-4 w-4" />}
                  Apply
                </Button>
              </div>

              {/* Summary */}
              <div className="flex gap-6 py-3 border-y border-border">
                <div>
                  <p className="text-xs text-muted-foreground">Total Sales</p>
                  <p className="text-xl font-bold">₹{totalSalesAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Commission</p>
                  <p className="text-xl font-bold text-green-600">₹{totalCommissionAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Records</p>
                  <p className="text-xl font-bold">{salesRecords.length}</p>
                </div>
              </div>

              {/* Sales Table */}
              {salesLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
              ) : salesRecords.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No sales records found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="pb-2 font-medium">Date</th>
                        <th className="pb-2 font-medium">Shop</th>
                        <th className="pb-2 font-medium text-right">Sale Amount</th>
                        <th className="pb-2 font-medium text-right">Commission</th>
                        <th className="pb-2 font-medium">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesRecords.map((sale) => (
                        <tr key={sale.id} className="border-b border-border/50">
                          <td className="py-2">{new Date(sale.sale_date).toLocaleDateString()}</td>
                          <td className="py-2">{sale.shop_name}</td>
                          <td className="py-2 text-right">₹{Number(sale.amount).toLocaleString()}</td>
                          <td className="py-2 text-right text-green-600">₹{Number(sale.commission_amount).toLocaleString()}</td>
                          <td className="py-2 text-muted-foreground">{sale.notes || "-"}</td>
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
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" /> Invitations ({invitations.length})
            </h2>
            <div className="space-y-2">
              {invitations.map((inv) => (
                <Card key={inv.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{inv.shop_name}</p>
                    <p className="text-sm text-muted-foreground">{inv.shop_location}</p>
                    <p className="text-sm">Commission: {inv.commission_rate}%</p>
                    {inv.message && <p className="text-sm text-muted-foreground italic">"{inv.message}"</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleInvitation(inv.id, "reject")}
                      disabled={processingInvite === inv.id}
                    >
                      <XCircle className="h-4 w-4 mr-1" /> Decline
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleInvitation(inv.id, "accept")}
                      disabled={processingInvite === inv.id}
                    >
                      {processingInvite === inv.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                      Accept
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Search Shops */}
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Search className="h-5 w-5" /> Find Shops
          </h2>
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Search by shop name, owner name, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={searching || !searchQuery.trim()}>
              {searching ? <Loader2 className="animate-spin" /> : <Search className="h-4 w-4" />}
              Search
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((shop) => (
                <Card key={shop.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{shop.name}</p>
                    <p className="text-sm text-muted-foreground">Owner: {shop.owner_name} | {shop.phone}</p>
                    <p className="text-sm text-muted-foreground">{shop.location}</p>
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
                    <Button size="sm" onClick={() => setSelectedShop(shop)}>
                      Request to Join <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                </Card>
              ))}
            </div>
          )}
          {searchResults.length === 0 && searchQuery && !searching && (
            <p className="text-muted-foreground text-center py-4">No shops found.</p>
          )}
        </div>

        {/* Request Dialog */}
        <Dialog open={!!selectedShop} onOpenChange={() => setSelectedShop(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request to Join {selectedShop?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Commission Rate You Want (%)</label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="5.0"
                  value={requestRate}
                  onChange={(e) => setRequestRate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Message (optional)</label>
                <Input
                  placeholder="Introduce yourself..."
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                />
              </div>
              <Button onClick={handleRequest} disabled={submitting || !requestRate} className="w-full">
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