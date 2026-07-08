"use client"

import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Loader2, Plus } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { MainLayout } from "@/components/layout/main-layout"

interface Sale {
  id: number
  agent_id: number
  agent_name: string
  amount: number
  commission_amount: number
  commission_rate?: number  // ADD THIS
  sale_date: string
  notes: string
}

interface Agent {
  id: number
  name: string
}

export default function ShopSalesPage() {
  const supabase = createClient()
  const params = useParams()
  const shopId = Number(params?.shopId)
  const [sales, setSales] = useState<Sale[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newSale, setNewSale] = useState({
    agent_id: "",
    amount: "",
    commission_amount: "",
    commission_rate: "",
    sale_date: new Date().toISOString().split("T")[0],
    notes: "",
  })

  useEffect(() => {
    fetchData()
  }, [shopId])

  const fetchData = async () => {
    setLoading(true)
    try {

           // Fetch sales
      const { data: salesData, error } = await supabase
        .from("sales")
        .select("*, agents:agent_id(name)")
        .eq("shop_id", shopId)
        .order("sale_date", { ascending: false })

      if (error) throw error

      const { data: linkedAgents } = await supabase
        .from("shop_agents")
        .select("agent_id, commission_rate, agents:agent_id(id, name)")
        .eq("shop_id", shopId)

      setAgents((linkedAgents || []).map((la: any) => ({
         id: la.agent_id,
        name: la.agents?.name || "Unknown",
        commission_rate: la.commission_rate,
      })))

      const formattedSales = (salesData || []).map((s: any) => ({
        id: s.id,
        agent_id: s.agent_id,
        agent_name: s.agents?.name || "Unknown",
        amount: s.amount,
        commission_amount: s.commission_amount,
        sale_date: s.sale_date,
        notes: s.notes,
      }))

      setSales(formattedSales)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleAddSale = async () => {
    try {
      const { error } = await supabase.from("sales").insert({
        shop_id: shopId,
        agent_id: Number(newSale.agent_id),
        amount: Number(newSale.amount),
        commission_amount: Number(newSale.commission_amount),
        commission_rate: Number(newSale.commission_rate), // Snapshot of rate used
        sale_date: newSale.sale_date,
        notes: newSale.notes,
      })

      if (error) throw error

      setNewSale({
        agent_id: "",
        amount: "",
        commission_amount: "",
        commission_rate: "",
        sale_date: new Date().toISOString().split("T")[0],
        notes: "",
      })
      setShowAddForm(false)
      fetchData()
    } catch (e) {
      console.error(e)
      alert("Failed to add sale")
    }
  }

  const handleAmountChange = (amount: string) => {
  const agent = agents.find(a => a.id === Number(newSale.agent_id))
  const rate = agent?.commission_rate || 0
  const commission = Number(amount) * (rate / 100)
  setNewSale({
    ...newSale,
    amount,
    commission_amount: commission.toFixed(2),
    commission_rate: String(rate),
  })
}

const handleAgentChange = (agentId: string) => {
  const agent = agents.find(a => a.id === Number(agentId))
  const rate = agent?.commission_rate || 0
  const commission = Number(newSale.amount) * (rate / 100)
  setNewSale({
    ...newSale,
    agent_id: agentId,
    commission_rate: String(rate),
    commission_amount: newSale.amount ? commission.toFixed(2) : "",
  })
}

  return (
    <MainLayout title="Sales" shopId={shopId}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sales</h1>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Sale
        </Button>
      </div>

      {showAddForm && (
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold">Record New Sale</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <select
  value={newSale.agent_id}
  onChange={(e) => handleAgentChange(e.target.value)}
  className="w-full rounded border border-input bg-background px-3 py-2"
>
              <option value="">Select Agent</option>
              {agents.map((a: any) => (
  <option key={a.id} value={a.id}>
    {a.name} ({a.commission_rate}% commission)
  </option>
))}
            </select>
            <Input 
  type="number" 
  placeholder="Sale Amount" 
  value={newSale.amount} 
  onChange={(e) => handleAmountChange(e.target.value)} 
/>
            <Input 
  type="number" 
  placeholder="Commission Amount" 
  value={newSale.commission_amount} 
  readOnly 
  className="bg-muted"
/>
            <Input type="date" value={newSale.sale_date} onChange={(e) => setNewSale({...newSale, sale_date: e.target.value})} />
            <Input placeholder="Notes" value={newSale.notes} onChange={(e) => setNewSale({...newSale, notes: e.target.value})} className="md:col-span-2" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
            <Button onClick={handleAddSale} disabled={!newSale.agent_id || !newSale.amount}>Add Sale</Button>
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
                <th className="pb-2">Agent</th>
                <th className="pb-2 text-right">Amount</th>
                <th className="pb-2 text-right">Commission</th>
                <th className="pb-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id} className="border-b">
                  <td className="py-2">{new Date(sale.sale_date).toLocaleDateString()}</td>
                  <td className="py-2">{sale.agent_name}</td>
                  <td className="py-2 text-right">₹{Number(sale.amount).toLocaleString()}</td>
                  <td className="py-2 text-right text-green-600">₹{Number(sale.commission_amount).toLocaleString()}</td>
                  <td className="py-2 text-muted-foreground">{sale.notes || "-"}</td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr><td colSpan={5} className="text-center text-muted-foreground py-8">No sales recorded</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </MainLayout>
  )
}