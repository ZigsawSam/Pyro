"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AddAgentDialog } from "@/components/agents/add-agent-dialog"
import { AgentProfileDialog } from "@/components/agents/agent-profile-dialog"
import { PayAgentDialog } from "@/components/agents/pay-agent-dialog"
import { Plus, CreditCard, UserRound, CheckCircle2, UserPlus, Bell, Search, ArrowRight, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface ShopAgent {
  link_id: number
  id: number
  name: string
  phone_number: string
  description?: string
  commission_rate: number
  total_sales: number
  total_commission: number
  pending_commission: number
  paid_commission: number
  account_name?: string
  account_number?: string
  bank_name?: string
  ifsc_code?: string
  upi_id?: string
}

interface AgentRequest {
  id: number
  agent_name: string
  agent_phone: string
  commission_rate: number
  status: string
  requested_by: string
  requested_at: string
}

export default function AgentsPage() {
  const params = useParams()
  const rawShopId = Array.isArray(params.shopId) ? params.shopId[0] : params.shopId
  const shopId = Number(rawShopId)
  const [agents, setAgents] = useState<ShopAgent[]>([])
  const [requests, setRequests] = useState<AgentRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showPayDialog, setShowPayDialog] = useState(false)
  const [showExistingDialog, setShowExistingDialog] = useState(false)
  const [showRequestsPanel, setShowRequestsPanel] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<ShopAgent | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  
  // Existing agent form
  const [existingPhone, setExistingPhone] = useState("")
  const [existingRate, setExistingRate] = useState("")
  const [existingMessage, setExistingMessage] = useState("")
  const [existingAgentData, setExistingAgentData] = useState<any>(null)
  const [searchingExisting, setSearchingExisting] = useState(false)
  const [sendingRequest, setSendingRequest] = useState(false)

  useEffect(() => { setIsMounted(true) }, [])

  const fetchAgents = async () => {
    try {
      const response = await fetch(`/api/shops/${shopId}/agents`)
      if (!response.ok) throw new Error("Failed to fetch agents")
      const data = await response.json()
      setAgents(data.agents || [])
    } catch (error) {
      console.error("Error fetching agents:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchRequests = async () => {
    try {
      const res = await fetch(`/api/shops/${shopId}/agent-requests`)
      const data = await res.json()
      setRequests(data.requests || [])
    } catch (e) { console.error(e) }
  }

  useEffect(() => {
    if (!isMounted) return
    fetchAgents()
    fetchRequests()
  }, [shopId, isMounted])

  const searchExistingAgent = async () => {
    if (!existingPhone) return
    setSearchingExisting(true)
    try {
      const res = await fetch(`/api/agents/lookup?phone=${encodeURIComponent(existingPhone)}`)
      const data = await res.json()
      if (data.agent) {
        setExistingAgentData(data.agent)
      } else {
        alert("No agent found with this phone number")
        setExistingAgentData(null)
      }
    } catch (e) { alert("Search failed") }
    finally { setSearchingExisting(false) }
  }

  const sendExistingRequest = async () => {
    if (!existingAgentData || !existingRate) return
    setSendingRequest(true)
    try {
      const res = await fetch(`/api/shops/${shopId}/agents/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: existingPhone,
          commission_rate: Number(existingRate),
          message: existingMessage,
        })
      })
      if (!res.ok) throw new Error("Failed")
      setShowExistingDialog(false)
      setExistingPhone("")
      setExistingRate("")
      setExistingMessage("")
      setExistingAgentData(null)
      fetchRequests()
      alert("Request sent to agent!")
    } catch (e) { alert("Failed to send request") }
    finally { setSendingRequest(false) }
  }

  const openProfile = (agent: ShopAgent) => {
    setSelectedAgent(agent)
    setShowProfile(true)
  }

  const openPay = (agent: ShopAgent) => {
    setSelectedAgent(agent)
    setShowPayDialog(true)
  }

  const pendingCount = requests.filter(r => r.status === 'pending').length
  const closedCount = requests.filter(r => r.status === 'approved' || r.status === 'rejected').length

  if (!isMounted) {
    return (
      <MainLayout title="Agents" shopId={shopId}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout title="Agents" subtitle="Manage agents for your shop" shopId={shopId}>
      {/* Top Actions */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Tap an agent to review their profile, or hover a card to pay them.</p>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setShowExistingDialog(true)}>
            <UserPlus size={18} /> Existing Agent
          </Button>
          <Button variant="outline" className="gap-2 relative" onClick={() => setShowRequestsPanel(true)}>
            <Bell size={18} /> Requests
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </Button>
          <Button onClick={() => setShowDialog(true)} className="gap-2">
            <Plus size={18} /> Add Agent
          </Button>
        </div>
      </div>

      {/* Agent Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {agents.map((agent) => {
          const pending = Number(agent.pending_commission || 0)
          const paid = Number(agent.paid_commission || 0)
          const totalCommission = Number(agent.total_commission || 0)
          const isCleared = pending === 0 && totalCommission > 0

          return (
            <Card key={agent.link_id} className="group relative h-full p-5 transition hover:shadow-lg">
              <div className="flex items-start justify-between gap-3">
                <button className="text-left flex-1" onClick={() => openProfile(agent)}>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{agent.name}</h3>
                    {isCleared && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{agent.description || "No description added yet."}</p>
                </button>
                <div className="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button size="sm" variant="outline" onClick={() => openPay(agent)}>
                    <CreditCard className="mr-2 h-4 w-4" /> Pay
                  </Button>
                </div>
              </div>

              <div className="mt-4 rounded-lg border bg-muted/30 overflow-hidden">
                <div className="flex items-center justify-between border-b border-border p-3">
                  <span className="text-sm font-medium">Pending</span>
                  <span className="text-lg font-bold text-amber-600">₹{pending.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-3">
                  <span className="text-sm font-medium">Paid</span>
                  <span className="text-sm">₹{paid.toLocaleString()}</span>
                </div>
                {isCleared && (
                  <div className="flex items-center justify-center gap-1 border-t border-border bg-emerald-50 p-2 text-emerald-600 font-bold">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-xs">All Cleared</span>
                  </div>
                )}
              </div>

              <Button variant="ghost" className="mt-4 w-full justify-start gap-2" onClick={() => openProfile(agent)}>
                <UserRound className="h-4 w-4" /> View Profile
              </Button>
            </Card>
          )
        })}
      </div>

      {agents.length === 0 && !isLoading ? (
        <Card className="mt-6 p-8 text-center text-muted-foreground">No agents are linked yet. Add one to start payouts.</Card>
      ) : null}

      {/* Existing Agent Dialog */}
      <Dialog open={showExistingDialog} onOpenChange={setShowExistingDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Existing Agent</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input 
                placeholder="Agent phone number" 
                value={existingPhone}
                onChange={(e) => setExistingPhone(e.target.value)}
              />
              <Button onClick={searchExistingAgent} disabled={searchingExisting || !existingPhone}>
                {searchingExisting ? <Loader2 className="animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
            
            {existingAgentData && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <UserRound className="h-5 w-5" />
                  <p className="font-medium">{existingAgentData.name}</p>
                </div>
                <p className="text-sm text-muted-foreground">{existingAgentData.phone_number}</p>
                {existingAgentData.description && <p className="text-sm">{existingAgentData.description}</p>}
                {existingAgentData.upi_id && <p className="text-sm text-muted-foreground">UPI: {existingAgentData.upi_id}</p>}
                
                <div>
                  <label className="block text-sm font-medium mb-1">Commission Rate (%)</label>
                  <Input 
                    type="number" 
                    step="0.1" 
                    placeholder="5.0"
                    value={existingRate}
                    onChange={(e) => setExistingRate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Message (optional)</label>
                  <Input 
                    placeholder="Invite message..."
                    value={existingMessage}
                    onChange={(e) => setExistingMessage(e.target.value)}
                  />
                </div>
                <Button onClick={sendExistingRequest} disabled={sendingRequest || !existingRate} className="w-full">
                  {sendingRequest ? <Loader2 className="animate-spin mr-2" /> : null}
                  Send Request
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Requests Panel Dialog */}
      <Dialog open={showRequestsPanel} onOpenChange={setShowRequestsPanel}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Agent Requests</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Pending */}
            <div>
              <h3 className="text-sm font-semibold text-amber-600 mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4" /> Pending ({pendingCount})
              </h3>
              {requests.filter(r => r.status === 'pending').map((req) => (
                <Card key={req.id} className="p-3 mb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{req.agent_name}</p>
                      <p className="text-sm text-muted-foreground">{req.agent_phone}</p>
                      <p className="text-sm">Rate: {req.commission_rate}% | {req.requested_by === 'agent' ? 'They requested' : 'You invited'}</p>
                    </div>
                    <Link href={`/shop/${shopId}/agents/requests`}>
                      <Button size="sm" variant="outline">Review</Button>
                    </Link>
                  </div>
                </Card>
              ))}
              {pendingCount === 0 && <p className="text-sm text-muted-foreground">No pending requests</p>}
            </div>

            {/* Closed */}
            {closedCount > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" /> Closed ({closedCount})
                </h3>
                {requests.filter(r => r.status === 'approved' || r.status === 'rejected').map((req) => (
                  <Card key={req.id} className="p-3 mb-2 opacity-60 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{req.agent_name}</p>
                        <p className="text-sm text-muted-foreground">{req.agent_phone}</p>
                        <p className="text-sm">Rate: {req.commission_rate}%</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        req.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {req.status === 'approved' ? 'Accepted' : 'Rejected'}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AddAgentDialog open={showDialog} onOpenChange={setShowDialog} onAgentAdded={fetchAgents} shopId={shopId} />
      <AgentProfileDialog open={showProfile} onOpenChange={setShowProfile} shopId={shopId} agent={selectedAgent} onUpdated={fetchAgents} onDeleted={fetchAgents} />
      <PayAgentDialog open={showPayDialog} onOpenChange={setShowPayDialog} shopId={shopId} agent={selectedAgent} onPaid={fetchAgents} />
    </MainLayout>
  )
}