"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { DataTable } from "@/components/data-table"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, Loader2 } from "lucide-react"

interface Sale {
  id: number
  agent_name: string
  amount: number
  commission_amount: number
  sale_date: string
  notes: string
}

export default function SalesPage() {
  const params = useParams()
  const shopId = Number(params.shopId as string)
  const [sales, setSales] = useState<Sale[]>([])
  const [agents, setAgents] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [formData, setFormData] = useState({
    agent_id: "",
    amount: "",
    notes: "",
  })

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const fetchSales = async () => {
    try {
      const response = await fetch(`/api/shops/${shopId}/sales`)
      if (!response.ok) throw new Error("Failed to fetch sales")
      const data = await response.json()
      setSales(data.sales)
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAgents = async () => {
    try {
      const response = await fetch(`/api/shops/${shopId}/agents`)
      if (!response.ok) throw new Error("Failed to fetch agents")
      const data = await response.json()
      setAgents(data.agents)
    } catch (error) {
      console.error("Error:", error)
    }
  }

  useEffect(() => {
    if (!isMounted) return
    fetchSales()
    fetchAgents()
  }, [shopId, isMounted])

  const handleAddSale = async () => {
    if (!formData.agent_id || !formData.amount) return
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/shops/${shopId}/sales`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agent_id: Number(formData.agent_id),
          amount: Number(formData.amount),
          notes: formData.notes,
        }),
      })

      if (!response.ok) throw new Error("Failed to add sale")
      setShowDialog(false)
      setFormData({ agent_id: "", amount: "", notes: "" })
      fetchSales()
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const columns = [
    { key: "sale_date", label: "Date", render: (v: string) => new Date(v).toLocaleDateString() },
    { key: "agent_name", label: "Agent" },
    { key: "amount", label: "Amount", render: (v: number) => `₹${v.toLocaleString()}` },
    { key: "commission_amount", label: "Commission", render: (v: number) => `₹${v.toLocaleString()}` },
    { key: "notes", label: "Notes" },
  ]

  if (!isMounted) {
    return (
      <MainLayout title="Sales" shopId={shopId}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout title="Sales" subtitle="Record and track agent sales" shopId={shopId}>
      <div className="mb-6">
        <Button onClick={() => setShowDialog(true)} className="gap-2">
          <Plus size={18} /> Add Sale
        </Button>
      </div>

      <Card className="p-6">
        <DataTable columns={columns} data={sales} isLoading={isLoading} />
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record New Sale</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Agent</label>
              <select
                value={formData.agent_id}
                onChange={(e) => setFormData({ ...formData, agent_id: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded bg-card"
              >
                <option value="">Select agent</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Sale Amount</label>
              <Input
                type="number"
                placeholder="10000"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <Input
                placeholder="Sale details"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
            <Button onClick={handleAddSale} disabled={isSubmitting} className="w-full">
              {isSubmitting ? <Loader2 className="mr-2 animate-spin" /> : ""}
              Add Sale
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  )
}