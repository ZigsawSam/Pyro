"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, Store, Clock, CheckCircle, XCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Shop {
  id: number
  name: string
  location: string
  connection_status: "available" | "pending" | "linked"
  requested_rate?: number
}

interface Request {
  id: number
  shop_name: string
  shop_location: string
  status: string
  commission_rate: number
  requested_at: string
}

export default function AgentShopsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [shops, setShops] = useState<Shop[]>([])
  const [myRequests, setMyRequests] = useState<Request[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null)
  const [commissionRate, setCommissionRate] = useState("")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [agentId, setAgentId] = useState<number | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/agent-login")
        return
      }
      const { data: agent } = await supabase
        .from("agents")
        .select("id")
        .eq("user_id", user.id)
        .single()
      
      if (!agent) {
        router.push("/auth/agent-login")
        return
      }
      setAgentId(agent.id)
      fetchData(agent.id)
    }
    init()
  }, [search])

  const fetchData = async (id: number) => {
    setLoading(true)
    try {
      // Fetch my requests
      const { data: reqData, error: reqError } = await supabase
        .from("agent_link_requests")
        .select(`
          id,
          shop_id,
          commission_rate,
          status,
          requested_at,
          shops:shop_id (shop_name, city, state)
        `)
        .eq("agent_id", id)

      if (reqError) throw reqError

      const formattedRequests = (reqData || []).map((req: any) => ({
        id: req.id,
        shop_name: req.shops?.shop_name || "Unknown Shop",
        shop_location: `${req.shops?.city || ""}, ${req.shops?.state || ""}`,
        status: req.status,
        commission_rate: req.commission_rate,
        requested_at: req.requested_at,
      }))
      setMyRequests(formattedRequests)

      // Fetch shops search results
      if (search.trim()) {
        const { data: shopsData, error: shopsError } = await supabase
          .from("shops")
          .select("id, shop_name, city, state")
          .or(`shop_name.ilike.%${search}%,city.ilike.%${search}%`)
          .limit(20)

        if (shopsError) throw shopsError

        // Check existing links/requests
        const { data: existingLinks } = await supabase
          .from("shop_agents")
          .select("shop_id")
          .eq("agent_id", id)

        const { data: pendingRequests } = await supabase
          .from("agent_link_requests")
          .select("shop_id, commission_rate")
          .eq("agent_id", id)
          .eq("status", "pending")

        const linkedIds = new Set((existingLinks || []).map((l: any) => l.shop_id))
        const pendingMap = new Map((pendingRequests || []).map((r: any) => [r.shop_id, r.commission_rate]))

        const formattedShops = (shopsData || []).map((shop: any) => {
          if (linkedIds.has(shop.id)) {
            return { id: shop.id, name: shop.shop_name, location: `${shop.city}, ${shop.state}`, connection_status: "linked" as const }
          }
          const pendingRate = pendingMap.get(shop.id)
          if (pendingRate !== undefined) {
            return { id: shop.id, name: shop.shop_name, location: `${shop.city}, ${shop.state}`, connection_status: "pending" as const, requested_rate: pendingRate }
          }
          return { id: shop.id, name: shop.shop_name, location: `${shop.city}, ${shop.state}`, connection_status: "available" as const }
        })

        setShops(formattedShops)
      } else {
        setShops([])
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleRequest = async () => {
    if (!selectedShop || !commissionRate || !agentId) return
    setSubmitting(true)
    try {
      // Check for existing pending request
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
          commission_rate: Number(commissionRate),
          message,
          status: "pending",
          requested_by: "agent",
        })

      if (error) throw error

      setSelectedShop(null)
      setCommissionRate("")
      setMessage("")
      if (agentId) fetchData(agentId)
    } catch (e) { alert("Failed to send request") }
    finally { setSubmitting(false) }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">Find Shops</h1>
      
      {/* My Requests */}
      {myRequests.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">My Requests</h2>
          <div className="space-y-2">
            {myRequests.map((req) => (
              <Card key={req.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{req.shop_name}</p>
                  <p className="text-sm text-muted-foreground">{req.shop_location}</p>
                  <p className="text-sm">Rate: {req.commission_rate}%</p>
                </div>
                <div className="flex items-center gap-2">
                  {req.status === 'pending' && <><Clock className="h-4 w-4 text-amber-500" /><span className="text-sm text-amber-600">Pending</span></>}
                  {req.status === 'approved' && <><CheckCircle className="h-4 w-4 text-green-500" /><span className="text-sm text-green-600">Approved</span></>}
                  {req.status === 'rejected' && <><XCircle className="h-4 w-4 text-red-500" /><span className="text-sm text-red-600">Rejected</span></>}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Search Shops */}
      <div className="flex gap-2">
        <Input 
          placeholder="Search shops by name or location..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
      </div>

      {loading ? <Loader2 className="animate-spin" /> : (
        <div className="grid gap-3">
          {shops.filter(s => s.connection_status !== 'linked').map((shop) => (
            <Card key={shop.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Store className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{shop.name}</p>
                  <p className="text-sm text-muted-foreground">{shop.location}</p>
                </div>
              </div>
              {shop.connection_status === 'pending' ? (
                <span className="text-sm text-amber-600 flex items-center gap-1">
                  <Clock className="h-4 w-4" /> Requested {shop.requested_rate}%
                </span>
              ) : (
                <Button size="sm" onClick={() => setSelectedShop(shop)}>Request to Join</Button>
              )}
            </Card>
          ))}
          {shops.filter(s => s.connection_status !== 'linked').length === 0 && (
            <p className="text-muted-foreground text-center py-8">No shops found</p>
          )}
        </div>
      )}

      {/* Request Dialog */}
      <Dialog open={!!selectedShop} onOpenChange={() => setSelectedShop(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request to Join {selectedShop?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Commission Rate You Want (%)</label>
              <Input 
                type="number" 
                step="0.1" 
                placeholder="5.0" 
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Message (optional)</label>
              <Input 
                placeholder="Introduce yourself..." 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            <Button onClick={handleRequest} disabled={submitting || !commissionRate} className="w-full">
              {submitting ? <Loader2 className="animate-spin mr-2" /> : null}
              Send Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}