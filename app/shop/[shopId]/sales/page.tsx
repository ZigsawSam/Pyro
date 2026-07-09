"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Loader2, Plus, TrendingUp, Calendar, User } from "lucide-react"
import { createShopClient } from "@/lib/supabase/shop-client"
import { MainLayout } from "@/components/layout/main-layout"

interface Sale {
  id: number
  agent_id: number
  agent_name: string
  amount: number
  commission_amount: number
  commission_rate: number
  sale_date: string
  notes: string
}

interface LinkedAgent {
  id: number
  name: string
  commission_rate: number
}

export default function ShopSalesPage() {
  const router = useRouter()
  const supabase = createShopClient()
  const [shopId, setShopId] = useState<number | null>(null)
  const [sales, setSales] = useState<Sale[]>([])
  const [agents, setAgents] = useState<LinkedAgent[]>([])
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
    // Get shopId from URL
    const path = window.location.pathname
    const match = path.match(/\/shop\/(\d+)\/sales/)
    if (match) {
      setShopId(Number(match[1]))
    }
  }, [])

  useEffect(() => {
    if (shopId) {
      checkAuth()
    }
  }, [shopId])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push("/auth/shop-login")
      return
    }
    // Verify user owns this shop
    const { data: shop } = await supabase
      .from("shops")
      .select("id, shop_name")
      .eq("id", shopId)
      .eq("user_id", user.id)
      .single()
    
    if (!shop) {
      router.push("/auth/shop-login")
      return
    }
    
    fetchData()
  }

  const fetchData = async () => {
    if (!shopId) return
    setLoading(true)
    try {
      // Fetch linked agents with commission rates
      const { data: linkedAgents, error: agentsError } = await supabase
        .from("shop_agents")
        .select(`
          agent_id,
          commission_rate,
          agents:agent_id (id, name)
        `)
        .eq("shop_id", shopId)

      if (agentsError) throw agentsError

      const formattedAgents = (linkedAgents || []).map((la: any) => ({
        id: la.agent_id,
        name: la.agents?.name || "Unknown",
        commission_rate: la.commission_rate,
      }))
      setAgents(formattedAgents)

      // Fetch sales for this shop
      const { data: salesData, error: salesError } = await supabase
        .from("sales")
        .select(`
          id,
          agent_id,
          amount,
          commission_amount,
          commission_rate,
          sale_date,
          notes,
          agents:agent_id (name)
        `)
        .eq("shop_id", shopId)
        .order("sale_date", { ascending: false })

      if (salesError) throw salesError

      const formattedSales = (salesData || []).map((s: any) => ({
        id: s.id,
        agent_id: s.agent_id,
        agent_name: s.agents?.name || "Unknown",
        amount: s.amount,
        commission_amount: s.commission_amount,
        commission_rate: s.commission_rate,
        sale_date: s.sale_date,
        notes: s.notes,
      }))
      setSales(formattedSales)
    } catch (e) {
      console.error("fetchData error:", e)
    } finally {
      setLoading(false)
    }
  }

  const handleAgentChange = (agentId: string) => {
    const agent = agents.find(a => a.id === Number(agentId))
    const rate = agent?.commission_rate || 0
    const amount = Number(newSale.amount)
    const commission = amount * (rate / 100)
    
    setNewSale({
      ...newSale,
      agent_id: agentId,
      commission_rate: String(rate),
      commission_amount: amount ? commission.toFixed(2) : "",
    })
  }

  const handleAmountChange = (amount: string) => {
    const agent = agents.find(a => a.id === Number(newSale.agent_id))
    const rate = agent?.commission_rate || 0
    const commission = Number(amount) * (rate / 100)
    
    setNewSale({
      ...newSale,
      amount,
      commission_rate: String(rate),
      commission_amount: amount ? commission.toFixed(2) : "",
    })
  }

  const handleAddSale = async () => {
    if (!shopId || !newSale.agent_id || !newSale.amount) return
    try {
      const { error } = await supabase.from("sales").insert({
        shop_id: shopId,
        agent_id: Number(newSale.agent_id),
        amount: Number(newSale.amount),
        commission_amount: Number(newSale.commission_amount),
        commission_rate: Number(newSale.commission_rate),
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
      console.error("handleAddSale error:", e)
      alert("Failed to add sale")
    }
  }

  const totalSales = sales.reduce((sum, s) => sum + Number(s.amount || 0), 0)
  const totalCommission = sales.reduce((sum, s) => sum + Number(s.commission_amount || 0), 0)

  return (
    <MainLayout title="Sales" shopId={shopId || undefined}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Sales</h1>
            <p className="text-sm text-muted-foreground">Record and track sales made by your agents</p>
          </div>
          <Button onClick={() => setShowAddForm(!showAddForm)} className="gap-2">
            <Plus className="h-4 w-4" /> {showAddForm ? "Cancel" : "Add Sale"}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Total Sales</p>
            <p className="text-2xl font-bold">₹{totalSales.toLocaleString()}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Total Commission</p>
            <p className="text-2xl font-bold text-green-600">₹{totalCommission.toLocaleString()}</p>
          </Card>
        </div>

        {/* Add Sale Form */}
        {showAddForm && (
          <Card className="p-4 space-y-4">
            <h3 className="font-semibold">Record New Sale</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-1">Agent</label>
                <select
                  value={newSale.agent_id}
                  onChange={(e) => handleAgentChange(e.target.value)}
                  className="w-full rounded border border-input bg-background px-3 py-2"
                >
                  <option value="">Select agent</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} ({agent.commission_rate}%)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Sale Amount (₹)</label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={newSale.amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Commission (₹)</label>
                <Input
                  type="number"
                  value={newSale.commission_amount}
                  readOnly
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Rate: {newSale.commission_rate}% (auto-calculated)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <Input
                  type="date"
                  value={newSale.sale_date}
                  onChange={(e) => setNewSale({...newSale, sale_date: e.target.value})}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <Input
                placeholder="Optional notes..."
                value={newSale.notes}
                onChange={(e) => setNewSale({...newSale, notes: e.target.value})}
              />
            </div>
            <Button 
              onClick={handleAddSale} 
              disabled={!newSale.agent_id || !newSale.amount}
              className="w-full"
            >
              Record Sale
            </Button>
          </Card>
        )}

        {/* Sales History */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : sales.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No sales recorded yet.</p>
            <p className="text-sm">Add your first sale using the button above.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {sales.map((sale) => (
              <Card key={sale.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{sale.agent_name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(sale.sale_date).toLocaleDateString()}
                        {sale.notes && <span>• {sale.notes}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">₹{Number(sale.amount).toLocaleString()}</p>
                    <p className="text-sm text-green-600">₹{Number(sale.commission_amount).toLocaleString()} commission</p>
                    <p className="text-xs text-muted-foreground">{sale.commission_rate}% rate</p>
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