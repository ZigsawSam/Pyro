"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Loader2, CheckCircle, XCircle, Clock } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { MainLayout } from "@/components/layout/main-layout"

interface AgentRequest {
  id: number
  agent_id: number
  agent_name: string
  agent_phone: string
  commission_rate: number
  message: string
  status: string
  requested_by: string
  requested_at: string
}

export default function AgentRequestsPage({ params }: { params: { shopId: string } }) {
  const router = useRouter()
  const supabase = createClient()
  const shopId = Number(params.shopId)
  const [requests, setRequests] = useState<AgentRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRequests()
  }, [shopId])

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("agent_requests")
        .select("*")
        .eq("shop_id", shopId)
        .order("requested_at", { ascending: false })

      if (error) throw error
      setRequests(data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (requestId: number, action: "approved" | "rejected") => {
    try {
      const { error } = await supabase
        .from("agent_requests")
        .update({ status: action, responded_at: new Date().toISOString() })
        .eq("id", requestId)
        .eq("shop_id", shopId)

      if (error) throw error

      if (action === "approved") {
        const request = requests.find((r) => r.id === requestId)
        if (request) {
          const { error: linkError } = await supabase.from("shop_agents").insert({
            shop_id: shopId,
            agent_id: request.agent_id,
            commission_rate: request.commission_rate || 0,
          })
          if (linkError) throw linkError
        }
      }

      fetchRequests()
    } catch (e) {
      console.error(e)
      alert("Action failed")
    }
  }

  return (
    <MainLayout title="Agent Requests" shopId={shopId}>
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <Card key={req.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{req.agent_name}</p>
                  <p className="text-sm text-muted-foreground">{req.agent_phone}</p>
                  <p className="text-sm">Rate: {req.commission_rate}%</p>
                  {req.message && <p className="text-sm text-muted-foreground italic">"{req.message}"</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {req.requested_by === "shop" ? "Sent by you" : "Received"} • {new Date(req.requested_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {req.status === "pending" ? (
                    <>
                      <Button size="sm" variant="outline" onClick={() => handleAction(req.id, "rejected")}>
                        <XCircle className="h-4 w-4 mr-1" /> Reject
                      </Button>
                      <Button size="sm" onClick={() => handleAction(req.id, "approved")}>
                        <CheckCircle className="h-4 w-4 mr-1" /> Approve
                      </Button>
                    </>
                  ) : (
                    <span className={`text-sm flex items-center gap-1 ${req.status === "approved" ? "text-green-600" : "text-red-600"}`}>
                      {req.status === "approved" ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                      {req.status}
                    </span>
                  )}
                </div>
              </div>
            </Card>
          ))}
          {requests.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No requests found</p>
          )}
        </div>
      )}
    </MainLayout>
  )
}