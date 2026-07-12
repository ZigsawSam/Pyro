"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Loader2, Plus, Search, Phone, UserCircle, CreditCard, UserRound } from "lucide-react"
import { createShopClient } from "@/lib/supabase/shop-client"
import { MainLayout } from "@/components/layout/main-layout"
import { AgentProfileDialog } from "@/components/agents/agent-profile-dialog"
import { PayAgentDialog } from "@/components/agents/pay-agent-dialog"
import { AddAgentDialog } from "@/components/agents/add-agent-dialog"

interface Agent {
  id: number
  name: string
  phone_number: string
  description?: string
  commission_rate: number
  account_name?: string
  account_number?: string
  bank_name?: string
  ifsc_code?: string
  upi_id?: string
  link_id: number
  total_commission?: number
  pending_commission?: number
  paid_commission?: number
}

interface ShopAgentsPageProps {
  shopId: string
  user?: any
}

export function ShopAgentsPage({ shopId: shopIdProp, user }: ShopAgentsPageProps) {
  const supabase = createShopClient()
  
  const shopId = parseInt(shopIdProp, 10)
  
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [showProfile, setShowProfile] = useState(false)
  const [showPayDialog, setShowPayDialog] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)

  useEffect(() => {
    if (!isNaN(shopId)) fetchAgents(shopId)
  }, [shopId])

  const fetchAgents = async (sid: number) => {
    setLoading(true)
    try {
      const { data: links, error: linkError } = await supabase
        .from("shop_agents")
        .select("id, agent_id, commission_rate")
        .eq("shop_id", sid)

      if (linkError) throw linkError
      if (!links || links.length === 0) { setAgents([]); setLoading(false); return }

      const agentIds = links.map((l) => l.agent_id)
      const { data: agentsData, error: agentError } = await supabase
        .from("agents")
        .select("id, name, phone_number, description, account_name, account_number, bank_name, ifsc_code, upi_id")
        .in("id", agentIds)

      if (agentError) throw agentError

      const { data: salesData } = await supabase
        .from("sales")
        .select("agent_id, amount, commission_amount")
        .eq("shop_id", sid)
        .in("agent_id", agentIds)

      const { data: payoutsData } = await supabase
        .from("payouts")
        .select("agent_id, amount_paid")
        .eq("shop_id", sid)
        .eq("person_type", "agent")
        .in("agent_id", agentIds)

      const salesByAgent: Record<number, { total: number; commission: number }> = {}
      ;(salesData || []).forEach((s: any) => {
        if (!salesByAgent[s.agent_id]) salesByAgent[s.agent_id] = { total: 0, commission: 0 }
        salesByAgent[s.agent_id].total += Number(s.amount || 0)
        salesByAgent[s.agent_id].commission += Number(s.commission_amount || 0)
      })

      const payoutsByAgent: Record<number, number> = {}
      ;(payoutsData || []).forEach((p: any) => {
        payoutsByAgent[p.agent_id] = (payoutsByAgent[p.agent_id] || 0) + Number(p.amount_paid || 0)
      })

      const formatted = (agentsData || []).map((agent: any) => {
        const link = links.find((l) => l.agent_id === agent.id)
        const totalCommission = salesByAgent[agent.id]?.commission || 0
        const totalPaid = payoutsByAgent[agent.id] || 0
        return {
          ...agent,
          link_id: link?.id,
          commission_rate: link?.commission_rate || 0,
          total_commission: totalCommission,
          pending_commission: Math.max(0, totalCommission - totalPaid),
          paid_commission: totalPaid,
        }
      })

      setAgents(formatted)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const filteredAgents = agents.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.phone_number?.includes(searchQuery)
  )

  const openProfile = (agent: Agent) => { setSelectedAgent(agent); setShowProfile(true) }
  const openPay = (agent: Agent) => { setSelectedAgent(agent); setShowPayDialog(true) }

  if (isNaN(shopId)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <MainLayout title="Agents" subtitle="Manage agents for your shop" shopId={shopId}>
      <div className="flex items-center justify-between mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Agent
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAgents.map((agent) => (
            <Card key={agent.id} className="p-5 card-hover cursor-pointer group" onClick={() => openProfile(agent)}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <UserCircle className="h-10 w-10 text-muted-foreground" />
                  <div>
                    <p className="font-semibold text-base">{agent.name}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {agent.phone_number || "No phone"}
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                {agent.description || "No description added yet."}
              </p>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between py-2 px-3 bg-secondary/50 rounded-lg">
                  <span className="text-sm font-medium">Pending</span>
                  <span className="text-sm font-bold text-amber-600">₹{Number(agent.pending_commission || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between py-2 px-3 bg-secondary/30 rounded-lg">
                  <span className="text-sm font-medium">Paid</span>
                  <span className="text-sm text-muted-foreground">₹{Number(agent.paid_commission || 0).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={(e) => { e.stopPropagation(); openProfile(agent) }}>
                  <UserRound className="mr-1 h-3 w-3" /> Profile
                </Button>
                <Button size="sm" className="flex-1" onClick={(e) => { e.stopPropagation(); openPay(agent) }} disabled={!agent.pending_commission || agent.pending_commission <= 0}>
                  <CreditCard className="mr-1 h-3 w-3" /> Pay
                </Button>
              </div>
            </Card>
          ))}
          {filteredAgents.length === 0 && (
            <p className="text-center text-muted-foreground py-8 col-span-full">No agents found.</p>
          )}
        </div>
      )}

      <AgentProfileDialog
        open={showProfile}
        onOpenChange={setShowProfile}
        shopId={shopId}
        agent={selectedAgent}
        onUpdated={() => { setShowProfile(false); if (!isNaN(shopId)) fetchAgents(shopId) }}
        onDeleted={() => { setShowProfile(false); if (!isNaN(shopId)) fetchAgents(shopId) }}
      />

      <PayAgentDialog
        open={showPayDialog}
        onOpenChange={setShowPayDialog}
        shopId={shopId}
        agent={selectedAgent}
        onPaid={() => { setShowPayDialog(false); if (!isNaN(shopId)) fetchAgents(shopId) }}
      />

      <AddAgentDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onAgentAdded={() => { setShowAddDialog(false); if (!isNaN(shopId)) fetchAgents(shopId) }}
        shopId={shopId}
      />
    </MainLayout>
  )
}
