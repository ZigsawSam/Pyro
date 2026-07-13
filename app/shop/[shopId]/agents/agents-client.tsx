"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Plus, Search, Phone, UserCircle, CreditCard, UserRound, ShieldCheck, BadgeAlert, MessageSquare, Percent, MapPin, Briefcase } from "lucide-react"
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

interface UnlinkedAgent {
  id: number
  name: string
  phone_number?: string
  description?: string
  city?: string
  state?: string
  experience_years?: number
}

interface ShopAgentsPageProps {
  shopId: string
  user?: any
}

export function ShopAgentsPage({ shopId: shopIdProp, user }: ShopAgentsPageProps) {
  const supabase = createShopClient()
  const shopId = parseInt(shopIdProp, 10)

  const [agents, setAgents] = useState<Agent[]>([])
  const [unlinkedAgents, setUnlinkedAgents] = useState<UnlinkedAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [directoryLoading, setDirectoryLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [showProfile, setShowProfile] = useState(false)
  const [showPayDialog, setShowPayDialog] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)

  // Edit commission rate modal state
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)
  const [overrideRate, setOverrideRate] = useState<number>(5)

  useEffect(() => {
    if (!isNaN(shopId)) {
      fetchAgents(shopId)
      fetchUnlinkedAgents(shopId)
    }
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

  const fetchUnlinkedAgents = async (sid: number) => {
    setDirectoryLoading(true)
    try {
      // Get all agent IDs already linked to this shop
      const { data: links, error: linkError } = await supabase
        .from("shop_agents")
        .select("agent_id")
        .eq("shop_id", sid)

      if (linkError) throw linkError

      const linkedAgentIds = (links || []).map((l) => l.agent_id)

      // Fetch agents NOT linked to this shop
      let query = supabase
        .from("agents")
        .select("id, name, phone_number, description, city, state, experience_years")
        .order("name", { ascending: true })
        .limit(20)

      if (linkedAgentIds.length > 0) {
        query = query.not("id", "in", `(${linkedAgentIds.join(",")})`)
      }

      const { data: unlinkedData, error: unlinkedError } = await query

      if (unlinkedError) throw unlinkedError
      setUnlinkedAgents(unlinkedData || [])
    } catch (e) {
      console.error("Failed to fetch unlinked agents:", e)
      setUnlinkedAgents([])
    } finally {
      setDirectoryLoading(false)
    }
  }

  const handleInviteAgent = async (agentId: number) => {
    try {
      const { error } = await supabase
        .from("shop_agents")
        .insert({
          shop_id: shopId,
          agent_id: agentId,
          commission_rate: 5, // default rate
        })

      if (error) throw error
      // Refresh both lists
      fetchAgents(shopId)
      fetchUnlinkedAgents(shopId)
    } catch (e) {
      console.error("Failed to invite agent:", e)
      alert("Failed to send invitation. Please try again.")
    }
  }

  const filteredAgents = agents.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.phone_number?.includes(searchQuery)
  )

  const openProfile = (agent: Agent) => { setSelectedAgent(agent); setShowProfile(true) }
  const openPay = (agent: Agent) => { setSelectedAgent(agent); setShowPayDialog(true) }

  const openEditRate = (agent: Agent) => {
    setEditingAgent(agent)
    setOverrideRate(agent.commission_rate || 5)
  }

  const handleUpdateRate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingAgent) return

    try {
      const { error } = await supabase
        .from("shop_agents")
        .update({ commission_rate: Number(overrideRate) })
        .eq("id", editingAgent.link_id)

      if (error) throw error
      setEditingAgent(null)
      if (!isNaN(shopId)) fetchAgents(shopId)
    } catch (e) {
      console.error("Failed to update rate:", e)
    }
  }

  if (isNaN(shopId)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <MainLayout title="Agents" subtitle="Manage agents for your shop" shopId={shopId}>
      {/* Title Header Banner */}
      <div className="flex justify-between items-center bg-white border border-border p-6 rounded-2xl mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              Partnership Agent Network
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage verified sales representatives, set individual commission margins, and accept incoming pitches.
            </p>
          </div>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Agent
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Partnership Roster (Left 2 columns) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Sales Affiliates Table */}
          <div className="bg-white border border-border rounded-xl p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
                Active Sales Affiliates ({filteredAgents.length})
              </h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search agents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64 text-xs"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                    <th className="pb-3">Agent Name</th>
                    <th className="pb-3">Phone</th>
                    <th className="pb-3 text-center">Pending</th>
                    <th className="pb-3 text-center">Paid</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      </td>
                    </tr>
                  ) : (
                    <>
                      {filteredAgents.map((agent) => (
                        <tr key={agent.id} className="text-xs text-foreground hover:bg-muted/30 transition-all">
                          <td className="py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-muted rounded-full flex items-center justify-center">
                                <UserCircle className="w-5 h-5 text-muted-foreground" />
                              </div>
                              <div>
                                <div className="font-semibold text-sm">{agent.name}</div>
                                <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                                  {agent.phone_number || "No phone"}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {agent.phone_number || "—"}
                            </div>
                          </td>
                          <td className="py-4 text-center font-bold text-amber-600">
                            ₹{Number(agent.pending_commission || 0).toLocaleString()}
                          </td>
                          <td className="py-4 text-center text-muted-foreground">
                            ₹{Number(agent.paid_commission || 0).toLocaleString()}
                          </td>
                          <td className="py-4 text-right">
                            <div className="inline-flex gap-1.5">
                              <button
                                onClick={() => openProfile(agent)}
                                className="px-2.5 py-1.5 bg-background hover:bg-muted border border-border text-[11px] text-foreground font-semibold rounded-md transition-all flex items-center gap-1"
                              >
                                <UserRound className="w-3 h-3" /> Profile
                              </button>
                              <button
                                onClick={() => openEditRate(agent)}
                                className="px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-[11px] text-primary font-semibold rounded-md transition-all flex items-center gap-1"
                              >
                                <Percent className="w-3 h-3" /> Rate
                              </button>
                              <button
                                onClick={() => openPay(agent)}
                                disabled={!agent.pending_commission || agent.pending_commission <= 0}
                                className="px-2.5 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-[11px] font-semibold rounded-md transition-all flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <CreditCard className="w-3 h-3" /> Pay
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredAgents.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-xs text-muted-foreground font-mono">
                            No active partnerships found. Use the directory on the side to connect.
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Connection Pitches Received */}
          <div className="bg-white border border-border rounded-xl p-5">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <BadgeAlert className="w-4 h-4 text-primary" />
              Connection Pitches Received
            </h2>
            <p className="text-xs text-muted-foreground text-center font-mono py-6">
              No pending pitches recorded.
            </p>
          </div>
        </div>

        {/* Affiliate Directory (Right 1 column) — DYNAMIC, NOT HARDCODED */}
        <div className="bg-white border border-border rounded-xl p-5 h-fit">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-3">
            Affiliate Directory
          </h2>
          <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
            Connect and negotiate contracts with top-tier commission agents registered in your region.
          </p>

          <div className="space-y-3">
            {directoryLoading ? (
              <div className="py-8 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : unlinkedAgents.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center font-mono py-6">
                No available agents in the directory. All registered agents are already connected.
              </p>
            ) : (
              unlinkedAgents.map((agent) => (
                <div key={agent.id} className="bg-muted/40 p-3.5 rounded-xl border border-border/80">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-background rounded-lg border border-border">
                      <UserCircle className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-xs text-foreground font-semibold">{agent.name}</h4>
                      <p className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {agent.city || "Unknown"}{agent.state ? `, ${agent.state}` : ""}
                      </p>
                    </div>
                  </div>
                  {agent.description && (
                    <p className="text-[11px] text-muted-foreground mt-2 bg-background/60 p-2 rounded border border-border/50">
                      "{agent.description}"
                    </p>
                  )}
                  <div className="mt-3 flex justify-between items-center border-t border-border/60 pt-2.5">
                    <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                      <Briefcase className="w-3 h-3" />
                      Exp: {agent.experience_years ? `${agent.experience_years} years` : "N/A"}
                    </span>
                    <button
                      onClick={() => handleInviteAgent(agent.id)}
                      className="px-2 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-[11px] font-semibold rounded transition-all"
                    >
                      Send Invitation
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Edit Commission Rate Dialog */}
      {editingAgent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleUpdateRate} className="bg-background border border-border w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
              Adjust Commission Rate
            </h3>
            <p className="text-xs text-muted-foreground">
              Set customized percentage margin for <strong className="text-foreground">{editingAgent.name}</strong>. Future sales will reflect this rate.
            </p>

            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="100"
                required
                value={overrideRate}
                onChange={(e) => setOverrideRate(Number(e.target.value))}
                className="w-full bg-muted border border-border focus:border-primary rounded-lg py-2 px-3 pl-9 text-xs text-foreground outline-none transition-all"
              />
              <Percent className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            </div>

            <div className="flex gap-2 pt-2 justify-end">
              <button
                type="button"
                onClick={() => setEditingAgent(null)}
                className="px-3 py-1.5 border border-border hover:bg-muted text-xs text-muted-foreground rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-lg transition-all"
              >
                Apply Override
              </button>
            </div>
          </form>
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
