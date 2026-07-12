"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Plus,
  Search,
  FileSpreadsheet,
  Filter,
  Trash2,
  UserCircle2,
  Percent,
} from "lucide-react"
import { createShopClient } from "@/lib/supabase/shop-client"
import { MainLayout } from "@/components/layout/main-layout"

interface SalesClientProps {
  shopId: string
  user?: any
}

interface SaleRecord {
  id: number
  shop_id: number
  agent_id: number
  amount: number
  commission_amount: number
  commission_rate: number
  sale_date: string
  notes: string | null
  invoice_number: string | null
  created_at: string
  status: string
  agent_name?: string
}

interface AgentLink {
  agent_id: number
  commission_rate: number
  agent_name?: string
}

export function ShopSalesPage({ shopId, user }: SalesClientProps) {
  const supabase = createShopClient()
  const [sales, setSales] = useState<SaleRecord[]>([])
  const [agents, setAgents] = useState<AgentLink[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [agentFilter, setAgentFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  const [selectedAgentId, setSelectedAgentId] = useState("")
  const [amount, setAmount] = useState<number>(0)
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [invoiceNo, setInvoiceNo] = useState("")
  const [remarks, setRemarks] = useState("")
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().split("T")[0])

  const shopIdNum = parseInt(shopId, 10)

  useEffect(() => {
    if (shopId) {
      fetchAgents().then(() => fetchSales())
    }
  }, [shopId])

  const fetchAgents = async () => {
    try {
      const { data: links } = await supabase
        .from("shop_agent_links")
        .select("agent_id, commission_rate")
        .eq("shop_id", shopIdNum)

      let agentLinks = links || []

      if (agentLinks.length === 0) {
        const { data: fallback } = await supabase
          .from("shop_agents")
          .select("agent_id, commission_rate")
          .eq("shop_id", shopIdNum)
        agentLinks = fallback || []
      }

      if (agentLinks.length === 0) {
        setAgents([])
        return
      }

      const agentIds = agentLinks.map((l: any) => l.agent_id)
      const { data: agentsData } = await supabase
        .from("agents")
        .select("id, name")
        .in("id", agentIds)

      const agentMap: Record<number, string> = {}
      ;(agentsData || []).forEach((a: any) => {
        agentMap[a.id] = a.name
      })

      const mapped = agentLinks.map((l: any) => ({
        agent_id: l.agent_id,
        commission_rate: l.commission_rate,
        agent_name: agentMap[l.agent_id] || `Agent ${l.agent_id}`,
      }))

      setAgents(mapped)
    } catch (err) {
      console.error("Fetch agents error:", err)
      setAgents([])
    }
  }

  const fetchSales = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .eq("shop_id", shopIdNum)
        .order("created_at", { ascending: false })

      if (error) throw error

      const mapped = (data || []).map((s: any) => ({
        id: s.id,
        shop_id: s.shop_id,
        agent_id: s.agent_id,
        amount: Number(s.amount) || 0,
        commission_amount: Number(s.commission_amount) || 0,
        commission_rate: Number(s.commission_rate) || 0,
        sale_date: s.sale_date,
        notes: s.notes,
        invoice_number: s.invoice_number,
        created_at: s.created_at,
        status: s.status || "confirmed",
        agent_name: undefined,
      }))

      const agentMap: Record<number, string> = {}
      agents.forEach((a) => {
        agentMap[a.agent_id] = a.agent_name || `Agent ${a.agent_id}`
      })

      mapped.forEach((s) => {
        s.agent_name = agentMap[s.agent_id] || `Agent ${s.agent_id}`
      })

      setSales(mapped)
    } catch (error: any) {
      console.error("Sales error:", error?.message || error)
      toast.error(error?.message || "Failed to load sales data")
    } finally {
      setLoading(false)
    }
  }

  const resolvedRate = selectedAgentId
    ? agents.find((a) => a.agent_id.toString() === selectedAgentId)?.commission_rate || 5
    : 5
  const commissionPreview = amount ? (amount * resolvedRate) / 100 : 0

  const handleRecordSale = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAgentId || !amount || amount <= 0) {
      toast.error("Please select an agent and enter a valid sale amount")
      return
    }

    try {
      const { error } = await supabase.from("sales").insert({
        shop_id: shopIdNum,
        agent_id: parseInt(selectedAgentId, 10),
        amount: amount,
        commission_rate: resolvedRate,
        commission_amount: commissionPreview,
        sale_date: saleDate,
        notes: remarks || `Sale to ${customerName || "Walk-in"}`,
        invoice_number: invoiceNo || null,
        status: "confirmed",
      })

      if (error) throw error

      toast.success("Sale recorded successfully")
      setIsAddDialogOpen(false)
      resetForm()
      fetchSales()
    } catch (err: any) {
      console.error("Record sale error:", err)
      toast.error(err?.message || "Failed to record sale")
    }
  }

  const handleCancelSale = async (saleId: number) => {
    const confirmation = window.confirm(
      "Are you sure you want to cancel this sale?"
    )
    if (!confirmation) return

    try {
      const { error } = await supabase
        .from("sales")
        .update({ status: "cancelled" })
        .eq("id", saleId)

      if (error) throw error

      toast.success("Sale cancelled")
      fetchSales()
    } catch (err: any) {
      toast.error(err?.message || "Failed to cancel sale")
    }
  }

  const resetForm = () => {
    setSelectedAgentId("")
    setAmount(0)
    setCustomerName("")
    setCustomerPhone("")
    setInvoiceNo("")
    setRemarks("")
    setSaleDate(new Date().toISOString().split("T")[0])
  }

  const filteredSales = sales.filter((s) => {
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      s.notes?.toLowerCase().includes(q) ||
      s.invoice_number?.toLowerCase().includes(q) ||
      s.id.toString().includes(q)
    const matchesAgent = agentFilter === "all" || s.agent_id.toString() === agentFilter
    const matchesStatus = statusFilter === "all" || s.status === statusFilter
    return matchesSearch && matchesAgent && matchesStatus
  })

  const formatCurrency = (amount: number) => {
    if (isNaN(amount) || amount == null) return "₹0"
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "—"
    const d = new Date(dateString)
    if (isNaN(d.getTime())) return "—"
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  if (loading) {
    return (
      <MainLayout title="Sales" subtitle="Loading..." shopId={shopIdNum}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout title="Sales" subtitle="Sales & Commissions Ledger" shopId={shopIdNum}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center bg-card border p-6 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-950 rounded-xl border border-emerald-800/40">
              <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Sales & Commissions Ledger</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Continuous transaction log linking orders directly to commission yields.
              </p>
            </div>
          </div>
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4" />
            Record Transaction
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-card border p-4 rounded-xl">
          <div className="relative w-full md:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search invoice, customer, sale ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
            <div className="flex items-center gap-1.5 bg-muted border px-2.5 py-1 rounded-lg">
              <UserCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
              <select
                value={agentFilter}
                onChange={(e) => setAgentFilter(e.target.value)}
                className="bg-transparent text-xs outline-none border-none py-0.5"
              >
                <option value="all">All Agents</option>
                {agents.map((a) => (
                  <option key={a.agent_id} value={a.agent_id}>
                    {a.agent_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1.5 bg-muted border px-2.5 py-1 rounded-lg">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-xs outline-none border-none py-0.5"
              >
                <option value="all">All Transactions</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sales Table */}
        <Card className="border overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-[10px] text-muted-foreground font-mono tracking-wider uppercase">
                    <th className="py-4 px-6 font-medium">Sale ID</th>
                    <th className="py-4 px-4 font-medium">Invoice</th>
                    <th className="py-4 px-4 font-medium">Date</th>
                    <th className="py-4 px-4 font-medium">Agent</th>
                    <th className="py-4 px-4 font-medium">Customer</th>
                    <th className="py-4 px-4 font-medium text-right">Order Value</th>
                    <th className="py-4 px-4 font-medium text-right">Commission</th>
                    <th className="py-4 px-4 font-medium text-right">Rate</th>
                    <th className="py-4 px-6 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-muted/30 transition-all">
                      <td className="py-4 px-6 font-mono font-bold text-muted-foreground">#{sale.id}</td>
                      <td className="py-4 px-4 font-mono text-xs text-muted-foreground">
                        {sale.invoice_number || "—"}
                      </td>
                      <td className="py-4 px-4 font-mono text-muted-foreground">{formatDate(sale.sale_date)}</td>
                      <td className="py-4 px-4 font-semibold">{sale.agent_name}</td>
                      <td className="py-4 px-4">
                        {sale.notes ? (
                          <span className="text-xs">{sale.notes}</span>
                        ) : (
                          <span className="text-muted-foreground italic text-xs">Walk-in</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right font-bold">{formatCurrency(sale.amount)}</td>
                      <td className="py-4 px-4 text-right font-mono text-emerald-500 font-bold">
                        +{formatCurrency(sale.commission_amount)}
                      </td>
                      <td className="py-4 px-4 text-right font-mono text-muted-foreground">
                        {sale.commission_rate}%
                      </td>
                      <td className="py-4 px-6 text-right">
                        {sale.status === "confirmed" ? (
                          <div className="inline-flex items-center gap-1.5">
                            <Badge variant="outline" className="bg-emerald-950 text-emerald-400 border-emerald-800/30 text-[10px]">
                              Confirmed
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                              onClick={() => handleCancelSale(sale.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <Badge variant="outline" className="bg-red-950 text-red-400 border-red-800/30 text-[10px]">
                            Cancelled
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredSales.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-xs text-muted-foreground font-mono">
                        No transactions recorded on this register.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* SALE FORM DIALOG */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-500" />
                Record New Transaction
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleRecordSale} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Select Reseller Agent*</label>
                <select
                  required
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border bg-background text-sm"
                >
                  <option value="">-- Choose Connected Agent --</option>
                  {agents.map((a) => (
                    <option key={a.agent_id} value={a.agent_id}>
                      {a.agent_name} ({a.commission_rate}%)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Total Sale Value (₹)*</label>
                  <Input
                    type="number"
                    required
                    min={1}
                    placeholder="e.g. 50000"
                    value={amount || ""}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Business Date</label>
                  <Input
                    type="date"
                    required
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>

              {selectedAgentId && amount > 0 && (
                <div className="p-3.5 bg-emerald-950/20 border border-emerald-900/30 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Percent className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs text-muted-foreground">Commission:</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {resolvedRate}% = ₹{commissionPreview.toLocaleString("en-IN")}
                  </span>
                </div>
              )}

              <div className="p-4 bg-muted/50 border rounded-xl space-y-3">
                <h4 className="text-[11px] text-muted-foreground font-mono font-bold uppercase tracking-wider">
                  Customer & Invoice
                </h4>
                <div className="space-y-2">
                  <Input
                    placeholder="Customer Full Name (e.g. Ramesh Prasad)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="h-9 text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Contact Phone"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="h-9 text-sm"
                    />
                    <Input
                      placeholder="Invoice No (INV-2026-X)"
                      value={invoiceNo}
                      onChange={(e) => setInvoiceNo(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Transaction Remarks</label>
                <Input
                  placeholder="e.g. Bulk sale of appliances"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="h-10"
                />
              </div>

              <div className="flex gap-2 pt-2 justify-end border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false)
                    resetForm()
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                  Confirm Entry
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  )
}