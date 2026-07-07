"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, UserPlus, CheckCircle, XCircle, Phone, ArrowLeft, User } from "lucide-react"
import Link from "next/link"

interface AgentRequest {
  id: number
  agent_name: string
  agent_phone: string
  agent_description?: string
  agent_account_name?: string
  agent_bank_name?: string
  agent_upi_id?: string
  commission_rate: number
  message?: string
  requested_at: string
  requested_by: string
}

export default function AgentRequestsPage() {
  const params = useParams()
  const shopId = Number(params.shopId)
  const [requests, setRequests] = useState<AgentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedReq, setSelectedReq] = useState<AgentRequest | null>(null)
  const [approveRate, setApproveRate] = useState("")
  const [processing, setProcessing] = useState(false)
  
  const [invitePhone, setInvitePhone] = useState("")
  const [inviteRate, setInviteRate] = useState("")
  const [inviting, setInviting] = useState(false)

  useEffect(() => { fetchRequests() }, [shopId])

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/shops/${shopId}/agent-requests`)
      const data = await res.json()
      setRequests(data.requests || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!selectedReq) return
    setProcessing(true)
    try {
      const res = await fetch(`/api/shops/${shopId}/agent-requests`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: selectedReq.id,
          action,
          commission_rate: action === 'approve' ? Number(approveRate) : undefined
        })
      })
      if (!res.ok) throw new Error("Failed")
      setSelectedReq(null)
      setApproveRate("")
      fetchRequests()
    } catch (e) { alert("Action failed") }
    finally { setProcessing(false) }
  }

  const handleInvite = async () => {
    if (!invitePhone || !inviteRate) return
    setInviting(true)
    try {
      const res = await fetch(`/api/shops/${shopId}/agents/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: invitePhone,
          commission_rate: Number(inviteRate)
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed")
      setInvitePhone("")
      setInviteRate("")
      alert(data.message)
      fetchRequests()
    } catch (e: any) { alert(e.message || "Invitation failed") }
    finally { setInviting(false) }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/shop/${shopId}/agents`}>
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold">Agent Requests</h1>
      </div>
      
      {/* Invite by Phone */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Phone className="h-4 w-4" /> Invite Agent by Phone
        </h3>
        <div className="flex gap-2">
          <Input 
            placeholder="Phone number" 
            value={invitePhone} 
            onChange={(e) => setInvitePhone(e.target.value)}
          />
          <Input 
            placeholder="Rate %" 
            type="number" 
            step="0.1"
            value={inviteRate} 
            onChange={(e) => setInviteRate(e.target.value)}
            className="w-24"
          />
          <Button onClick={handleInvite} disabled={inviting || !invitePhone || !inviteRate}>
            {inviting ? <Loader2 className="animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Invite
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          If agent is registered, they will see your invitation. If not, an account will be created for them.
        </p>
      </Card>

      {/* Pending Requests */}
      <h3 className="font-semibold">Pending Requests ({requests.length})</h3>
      {loading ? <Loader2 className="animate-spin" /> : (
        <div className="space-y-2">
          {requests.map((req) => (
            <Card key={req.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <p className="font-medium">{req.agent_name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      req.requested_by === 'agent' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {req.requested_by === 'agent' ? 'Agent Requested' : 'You Invited'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{req.agent_phone}</p>
                  
                  {/* Auto-filled details from agent registration */}
                  {(req.agent_description || req.agent_account_name || req.agent_bank_name || req.agent_upi_id) && (
                    <div className="mt-2 rounded bg-muted/30 p-2 text-xs space-y-1">
                      {req.agent_description && <p><span className="font-medium">Description:</span> {req.agent_description}</p>}
                      {req.agent_account_name && <p><span className="font-medium">Account:</span> {req.agent_account_name} {req.agent_bank_name ? `| ${req.agent_bank_name}` : ''}</p>}
                      {req.agent_upi_id && <p><span className="font-medium">UPI:</span> {req.agent_upi_id}</p>}
                    </div>
                  )}
                  
                  <p className="text-sm mt-2">Wants: {req.commission_rate}% commission</p>
                  {req.message && <p className="text-sm text-muted-foreground italic">"{req.message}"</p>}
                </div>
                <Button size="sm" onClick={() => { setSelectedReq(req); setApproveRate(req.commission_rate.toString()) }}>
                  Review
                </Button>
              </div>
            </Card>
          ))}
          {requests.length === 0 && <p className="text-muted-foreground">No pending requests</p>}
        </div>
      )}

      {/* Approve/Reject Dialog */}
      <Dialog open={!!selectedReq} onOpenChange={() => setSelectedReq(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review {selectedReq?.requested_by === 'agent' ? 'Request from' : 'Invitation to'} {selectedReq?.agent_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedReq?.agent_description && (
              <div className="rounded bg-muted/30 p-3 text-sm">
                <p><span className="font-medium">Description:</span> {selectedReq.agent_description}</p>
                {selectedReq.agent_account_name && <p><span className="font-medium">Bank:</span> {selectedReq.agent_account_name} {selectedReq.agent_bank_name ? `- ${selectedReq.agent_bank_name}` : ''}</p>}
                {selectedReq.agent_upi_id && <p><span className="font-medium">UPI:</span> {selectedReq.agent_upi_id}</p>}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Commission Rate to Approve (%)</label>
              <Input 
                type="number" 
                step="0.1" 
                value={approveRate}
                onChange={(e) => setApproveRate(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => handleAction('reject')} disabled={processing}>
                <XCircle className="h-4 w-4 mr-1" /> Reject
              </Button>
              <Button className="flex-1" onClick={() => handleAction('approve')} disabled={processing}>
                {processing ? <Loader2 className="animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                Approve
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}