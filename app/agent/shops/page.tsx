"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, Store, Clock, CheckCircle, XCircle } from "lucide-react"

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
  const [shops, setShops] = useState<Shop[]>([])
  const [myRequests, setMyRequests] = useState<Request[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null)
  const [commissionRate, setCommissionRate] = useState("")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  
  // Get agentId from your auth context/storage
  const agentId = 1 // Replace with actual

  useEffect(() => { fetchData() }, [search])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [shopsRes, reqRes] = await Promise.all([
        fetch(`/api/agent/shops?agentId=${agentId}&search=${encodeURIComponent(search)}`),
        fetch(`/api/agent/link-requests?agentId=${agentId}`)
      ])
      const shopsData = await shopsRes.json()
      const reqData = await reqRes.json()
      setShops(shopsData.shops || [])
      setMyRequests(reqData.requests || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleRequest = async () => {
    if (!selectedShop || !commissionRate) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/agent/link-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: agentId,
          shop_id: selectedShop.id,
          commission_rate: Number(commissionRate),
          message
        })
      })
      if (!res.ok) throw new Error("Failed")
      setSelectedShop(null)
      setCommissionRate("")
      setMessage("")
      fetchData()
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