"use client"

import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Loader2, Plus, Wallet, TrendingUp, ArrowDownCircle } from "lucide-react"
import { createShopClient } from "@/lib/supabase/shop-client"
import { MainLayout } from "@/components/layout/main-layout"

interface Payout {
  id: number
  agent_id?: number
  staff_id?: number
  person_name: string
  person_type: string
  amount_paid: number
  payment_date: string
  remarks: string
}

interface Person {
  id: number
  name: string
  pending_commission: number
}

export default function ShopPayoutsPage() {
  const supabase = createShopClient()
  const params = useParams()
  const shopId = Number(params?.shopId)
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [agents, setAgents] = useState<Person[]>([])
  const [staff, setStaff] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newPayout, setNewPayout] = useState({
    person_type: "agent" as "agent" | "staff",
    person_id: "",
    amount_paid: "",
    payment_date: new Date().toISOString().split("T")[0],
    remarks: "",
  })

  useEffect(() => {
    fetchData()
  }, [shopId])

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: agentsData } = await supabase
        .from("shop_agents")
        .select("agent_id, commission_rate, agents:agent_id(id, name)")
        .eq("shop_id", shopId)

      const { data: staffData } = await supabase
        .from("staff")
        .select("id, name")
        .eq("shop_id", shopId)

      const { data: salesData } = await supabase
        .from("sales")
        .select("agent_id, amount, commission_amount")
        .eq("shop_id", shopId)

      const { data: payoutsData } = await supabase
        .from("payouts")
        .select("agent_id, staff_id, amount_paid")
        .eq("shop_id", shopId)

      const agentSales = (salesData || []).reduce((acc: any, s: any) => {
        if (!acc[s.agent_id]) acc[s.agent_id] = { total: 0, commission: 0 }
        acc[s.agent_id].total += Number(s.amount || 0)
        acc[s.agent_id].commission += Number(s.commission_amount || 0)
        return acc
      }, {})

      const agentPayouts = (payoutsData || [])
        .filter((p: any) => p.agent_id)
        .reduce((acc: any, p: any) => {
          acc[p.agent_id] = (acc[p.agent_id] || 0) + Number(p.amount_paid || 0)
          return acc
        }, {})

      const formattedAgents = (agentsData || []).map((a: any) => ({
        id: a.agent_id,
        name: a.agents?.name || "Unknown",
        pending_commission: (agentSales[a.agent_id]?.commission || 0) - (agentPayouts[a.agent_id] || 0),
      }))

      const staffPayouts = (payoutsData || [])
        .filter((p: any) => p.staff_id)
        .reduce((acc: any, p: any) => {
          acc[p.staff_id] = (acc[p.staff_id] || 0) + Number(p.amount_paid || 0)
          return acc
        }, {})

      const formattedStaff = (staffData || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        pending_commission: 0,
      }))

      setAgents(formattedAgents)
      setStaff(formattedStaff)

      const { data: payoutsRaw, error } = await supabase
        .from("payouts")
        .select("*")
        .eq("shop_id", shopId)
        .order("payment_date", { ascending: false })

      if (error) throw error

      const enrichedPayouts = (payoutsRaw || []).map((p: any) => {
        let personName = "Unknown"
        if (p.person_type === "agent" && p.agent_id) {
          const agent = formattedAgents.find((a: any) => a.id === p.agent_id)
          personName = agent?.name || "Unknown"
        } else if (p.person_type === "staff" && p.staff_id) {
          const staffMember = formattedStaff.find((s: any) => s.id === p.staff_id)
          personName = staffMember?.name || "Unknown"
        }
        return { ...p, person_name: personName }
      })

      setPayouts(enrichedPayouts)
    } catch (e) {
      console.error("fetchData error:", e)
    } finally {
      setLoading(false)
    }
  }

  const handleAddPayout = async () => {
    try {
      const personId = Number(newPayout.person_id)
      const paymentAmount = Number(newPayout.amount_paid)
      
      if (!personId || !paymentAmount || paymentAmount <= 0) {
        alert("Please select a person and enter a valid amount")
        return
      }

      const personList = newPayout.person_type === "agent" ? agents : staff
      const person = personList.find((p: any) => p.id === personId)
      const pendingCommission = person?.pending_commission || 0

      let pendingDeducted = 0
      let advanceAmount = 0

      if (pendingCommission > 0) {
        if (paymentAmount >= pendingCommission) {
          pendingDeducted = pendingCommission
          advanceAmount = paymentAmount - pendingCommission
        } else {
          pendingDeducted = paymentAmount
          advanceAmount = 0
        }
      } else {
        pendingDeducted = 0
        advanceAmount = paymentAmount
      }

      const payoutData: any = {
        shop_id: shopId,
        person_type: newPayout.person_type,
        amount_paid: paymentAmount,
        payment_date: newPayout.payment_date,
        remarks: newPayout.remarks || `Pending: ₹${pendingDeducted}, Advance: ₹${advanceAmount}`,
      }

      if (newPayout.person_type === "agent") {
        payoutData.agent_id = personId
      } else {
        payoutData.staff_id = personId
      }

      const { error } = await supabase.from("payouts").insert(payoutData)

      if (error) throw error

      setNewPayout({
        person_type: "agent",
        person_id: "",
        amount_paid: "",
        payment_date: new Date().toISOString().split("T")[0],
        remarks: "",
      })
      setShowAddForm(false)
      fetchData()
    } catch (e) {
      console.error("handleAddPayout error:", e)
      alert("Failed to record payout")
    }
  }

  const personOptions = newPayout.person_type === "agent" ? agents : staff

  return (
    <MainLayout title="Payouts" subtitle="Record payments to agents and staff" shopId={shopId}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-end">
          <Button onClick={() => setShowAddForm(!showAddForm)} className="gap-2">
            <Plus className="h-4 w-4" /> {showAddForm ? "Cancel" : "Record Payout"}
          </Button>
        </div>

        {showAddForm && (
          <Card className="p-4 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Wallet className="h-4 w-4" /> Record New Payout
            </h3>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-1">Person Type</label>
                <select
                  value={newPayout.person_type}
                  onChange={(e) => setNewPayout({ ...newPayout, person_type: e.target.value as "agent" | "staff", person_id: "" })}
                  className="w-full rounded border border-input bg-background px-3 py-2"
                >
                  <option value="agent">Agent</option>
                  <option value="staff">Staff</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  Select {newPayout.person_type === "agent" ? "Agent" : "Staff"}
                  {personOptions.length > 0 && (
                    <span className="text-xs text-muted-foreground ml-1">
                      (Pending shown)
                    </span>
                  )}
                </label>
                <select
                  value={newPayout.person_id}
                  onChange={(e) => setNewPayout({ ...newPayout, person_id: e.target.value })}
                  className="w-full rounded border border-input bg-background px-3 py-2"
                >
                  <option value="">Select...</option>
                  {personOptions.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name} {person.pending_commission > 0 ? `(Pending: ₹${person.pending_commission.toFixed(2)})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Amount (₹)</label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={newPayout.amount_paid}
                  onChange={(e) => setNewPayout({ ...newPayout, amount_paid: e.target.value })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Payment Date</label>
                <Input
                  type="date"
                  value={newPayout.payment_date}
                  onChange={(e) => setNewPayout({ ...newPayout, payment_date: e.target.value })}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Remarks (optional)</label>
              <Input
                placeholder="Payment notes..."
                value={newPayout.remarks}
                onChange={(e) => setNewPayout({ ...newPayout, remarks: e.target.value })}
              />
            </div>
            
            <Button 
              onClick={handleAddPayout} 
              disabled={!newPayout.person_id || !newPayout.amount_paid}
              className="w-full"
            >
              <ArrowDownCircle className="h-4 w-4 mr-2" /> Record Payout
            </Button>
          </Card>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : payouts.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No payouts recorded yet.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {payouts.map((payout) => (
              <Card key={payout.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded">
                      <TrendingUp className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{payout.person_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{payout.person_type}</p>
                      <p className="text-xs text-muted-foreground">{new Date(payout.payment_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">₹{Number(payout.amount_paid).toLocaleString()}</p>
                    {payout.remarks && <p className="text-xs text-muted-foreground">{payout.remarks}</p>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  )
}