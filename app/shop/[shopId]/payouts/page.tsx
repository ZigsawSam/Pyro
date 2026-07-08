"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Loader2, Plus } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Payout {
  id: number
  person_id: number
  person_name: string
  person_type: string
  amount_paid: number
  payment_date: string
  remarks: string
  is_advance: boolean
}

export default function ShopPayoutsPage({ params }: { params: { shopId: string } }) {
  const supabase = createClient()
  const shopId = Number(params.shopId)
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [agents, setAgents] = useState<{id: number, name: string}[]>([])
  const [staff, setStaff] = useState<{id: number, name: string}[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newPayout, setNewPayout] = useState({
    person_type: "agent",
    person_id: "",
    amount_paid: "",
    payment_date: new Date().toISOString().split("T")[0],
    remarks: "",
    is_advance: false,
  })

  useEffect(() => {
    fetchData()
  }, [shopId])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch agents and staff for dropdowns
      const [{ data: agentsData }, { data: staffData }] = await Promise.all([
        supabase.from("shop_agents").select("agent_id, agents:agent_id(id, name)").eq("shop_id", shopId),
        supabase.from("staff").select("id, name").eq("shop_id", shopId),
      ])

      setAgents((agentsData || []).map((a: any) => ({ id: a.agent_id, name: a.agents?.name || "Unknown" })))
      setStaff((staffData || []).map((s: any) => ({ id: s.id, name: s.name })))

      // Fetch payouts
      const { data, error } = await supabase
        .from("payouts")
        .select("*")
        .eq("shop_id", shopId)
        .order("payment_date", { ascending: false })

      if (error) throw error

      // Enrich with names
      const enrichedPayouts = await Promise.all((data || []).map(async (p: any) => {
        let personName = "Unknown"
        if (p.person_type === "agent") {
          const { data: agent } = await supabase.from("agents").select("name").eq("id", p.person_id).single()
          personName = agent?.name || "Unknown"
        } else {
          const { data: staffMember } = await supabase.from("staff").select("name").eq("id", p.person_id).single()
          personName = staffMember?.name || "Unknown"
        }
        return { ...p, person_name: personName }
      }))

      setPayouts(enrichedPayouts)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleAddPayout = async () => {
    try {
      const { error } = await supabase.from("payouts").insert({
        shop_id: shopId,
        person_id: Number(newPayout.person_id),
        person_type: newPayout.person_type,
        amount_paid: Number(newPayout.amount_paid),
        payment_date: newPayout.payment_date,
        remarks: newPayout.remarks,
        is_advance: newPayout.is_advance,
      })

      if (error) throw error

      setNewPayout({
        person_type: "agent",
        person_id: "",
        amount_paid: "",
        payment_date: new Date().toISOString().split("T")[0],
        remarks: "",
        is_advance: false,
      })
      setShowAddForm(false)
      fetchData()
    } catch (e) {
      console.error(e)
      alert("Failed to record payout")
    }
  }

  const personOptions = newPayout.person_type === "agent" ? agents : staff

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Payouts</h1>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="mr-2 h-4 w-4" /> Record Payout
        </Button>
      </div>

      {showAddForm && (
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold">Record Payout</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <select
              value={newPayout.person_type}
              onChange={(e) => setNewPayout({...newPayout, person_type: e.target.value, person_id: ""})}
              className="w-full rounded border border-input bg-background px-3 py-2"
            >
              <option value="agent">Agent</option>
              <option value="staff">Staff</option>
            </select>
            <select
              value={newPayout.person_id}
              onChange={(e) => setNewPayout({...newPayout, person_id: e.target.value})}
              className="w-full rounded border border-input bg-background px-3 py-2"
            >
              <option value="">Select {newPayout.person_type}</option>
              {personOptions.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <Input type="number" placeholder="Amount" value={newPayout.amount_paid} onChange={(e) => setNewPayout({...newPayout, amount_paid: e.target.value})} />
            <Input type="date" value={newPayout.payment_date} onChange={(e) => setNewPayout({...newPayout, payment_date: e.target.value})} />
            <Input placeholder="Remarks" value={newPayout.remarks} onChange={(e) => setNewPayout({...newPayout, remarks: e.target.value})} />
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newPayout.is_advance}
                onChange={(e) => setNewPayout({...newPayout, is_advance: e.target.checked})}
              />
              <span className="text-sm">Is Advance</span>
            </label>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
            <Button onClick={handleAddPayout} disabled={!newPayout.person_id || !newPayout.amount_paid}>Record</Button>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2">Date</th>
                <th className="pb-2">Person</th>
                <th className="pb-2">Type</th>
                <th className="pb-2 text-right">Amount</th>
                <th className="pb-2">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="py-2">{new Date(p.payment_date).toLocaleDateString()}</td>
                  <td className="py-2">{p.person_name}</td>
                  <td className="py-2 capitalize">{p.person_type} {p.is_advance && <span className="text-amber-600 text-xs">(advance)</span>}</td>
                  <td className="py-2 text-right">₹{Number(p.amount_paid).toLocaleString()}</td>
                  <td className="py-2 text-muted-foreground">{p.remarks || "-"}</td>
                </tr>
              ))}
              {payouts.length === 0 && (
                <tr><td colSpan={5} className="text-center text-muted-foreground py-8">No payouts recorded</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}