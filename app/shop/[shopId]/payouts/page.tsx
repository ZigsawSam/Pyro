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
import { getShopToken } from "@/lib/storage-utils"

interface Payout {
  id: number
  person_name: string
  person_type: string
  amount_paid: number
  payment_date: string
  remarks: string
  is_advance: number
}

interface PersonItem {
  id: number
  name: string
  pending_amount: number
  type: "agent" | "staff"
}

export default function PayoutsPage() {
  const params = useParams()
  const rawShopId = Array.isArray(params.shopId) ? params.shopId[0] : params.shopId
  const shopId = Number(rawShopId)
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [people, setPeople] = useState<PersonItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [formData, setFormData] = useState({ person_type: "agent", person_id: "", amount_paid: "", remarks: "" })

  useEffect(() => { fetchPayouts(); fetchPeople() }, [shopId])

  const fetchPayouts = async () => {
    try {
      const token = getShopToken()
      const response = await fetch(`/api/shops/${shopId}/payouts`, { headers: { Authorization: `Bearer ${token}` } })
      if (!response.ok) throw new Error("Failed to fetch payouts")
      const data = await response.json()
      setPayouts(data.payouts || [])
    } catch (error) { console.error("Error:", error) } finally { setIsLoading(false) }
  }

  const fetchPeople = async () => {
    try {
      const token = getShopToken()
      const [agentsResponse, staffResponse] = await Promise.all([
        fetch(`/api/shops/${shopId}/agents`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/shops/${shopId}/staff`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      const agentsData = await agentsResponse.json()
      const staffData = await staffResponse.json()

      const allAgents = (agentsData.agents || []).map((a: any) => ({
        id: a.id,
        name: a.name,
        pending_amount: Number(a.pending_commission || 0),
        type: "agent" as const
      }))
      const allStaff = (staffData.staff || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        pending_amount: Number(s.pending_payroll || 0),
        type: "staff" as const
      }))
      
      setPeople([...allAgents, ...allStaff])
    } catch (error) { console.error("Error:", error) }
  }

  const handleAddPayout = async () => {
    if (!formData.person_id || !formData.amount_paid) return
    setIsSubmitting(true)
    try {
      const token = getShopToken()
      const response = await fetch(`/api/shops/${shopId}/payouts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          person_type: formData.person_type,
          person_id: Number(formData.person_id),
          amount_paid: Number(formData.amount_paid),
          remarks: formData.remarks,
        }),
      })
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: "Unknown" }))
        throw new Error(errData.details || errData.error || "Failed to add payout")
      }
      const result = await response.json()

      // Show feedback about split
      if (result.advance_amount > 0) {
        alert(`Payment recorded: ₹${Number(result.amount_paid).toLocaleString()}\n₹${Number(result.clearing_amount).toLocaleString()} cleared pending\n₹${Number(result.advance_amount).toLocaleString()} saved as advance`)
      }

      setShowDialog(false)
      setConfirmOpen(false)
      setFormData({ person_type: "agent", person_id: "", amount_paid: "", remarks: "" })
      fetchPayouts(); fetchPeople()
    } catch (error) { console.error("Error:", error) } finally { setIsSubmitting(false) }
  }

  const columns = [
    { key: "payment_date", label: "Date", render: (v: string) => new Date(v).toLocaleDateString() },
    { key: "person_name", label: "Person" },
    { key: "person_type", label: "Type", render: (v: string) => v === "staff" ? "Staff" : "Agent" },
    { key: "amount_paid", label: "Amount", render: (v: number) => `₹${Number(v).toLocaleString()}` },
    { key: "remarks", label: "Remarks" },
    { key: "is_advance", label: "Type", render: (v: number) => v ? "Advance" : "Clearing" },
  ]

  const selectedPerson = people.find(p => p.id === Number(formData.person_id) && p.type === formData.person_type)

  return (
    <MainLayout title="Payouts" subtitle="Manage cash payouts to people" shopId={shopId}>
      <div className="mb-6">
        <Button onClick={() => setShowDialog(true)} className="gap-2">
          <Plus size={18} /> Record Payment
        </Button>
      </div>

      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-3">Pending Amounts</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {people.filter(p => p.pending_amount > 0).map((item) => (
            <Card key={`${item.type}-${item.id}`} className="p-4 border-l-4 border-l-amber-500">
              <p className="font-semibold text-foreground">{item.name}</p>
              <p className="text-sm text-muted-foreground">{item.type === "staff" ? "Staff" : "Agent"}</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">₹{item.pending_amount.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">pending</span></p>
            </Card>
          ))}
        </div>
        {people.filter(p => p.pending_amount > 0).length === 0 && (
          <p className="text-sm text-muted-foreground mt-2">No pending amounts to clear.</p>
        )}
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Payment History</h3>
        <DataTable columns={columns} data={payouts} isLoading={isLoading} />
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Person Type</label>
              <select 
                value={formData.person_type} 
                onChange={(e) => setFormData({ ...formData, person_type: e.target.value, person_id: "" })} 
                className="w-full rounded border border-border bg-card px-3 py-2"
              >
                <option value="agent">Agent</option>
                <option value="staff">Staff</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Person</label>
              <select 
                value={formData.person_id} 
                onChange={(e) => setFormData({ ...formData, person_id: e.target.value })} 
                className="w-full rounded border border-border bg-card px-3 py-2"
              >
                <option value="">Select person</option>
                {people.filter((item) => item.type === formData.person_type).map((item) => (
                  <option key={`${item.type}-${item.id}`} value={item.id}>
                    {item.name} {item.pending_amount > 0 ? `(₹${item.pending_amount.toLocaleString()} pending)` : "(no pending)"}
                  </option>
                ))}
              </select>
            </div>
            
            {selectedPerson && (
              <div className={`rounded border p-2 text-sm ${selectedPerson.pending_amount > 0 ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-green-50 border-green-200 text-green-800'}`}>
                {selectedPerson.pending_amount > 0 
                  ? `Pending: ₹${selectedPerson.pending_amount.toLocaleString()} — payment will first clear this, remainder goes to advance`
                  : `No pending amount — entire payment will be saved as advance`
                }
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium mb-1">Amount to Pay</label>
              <Input 
                type="number" 
                placeholder="5000" 
                value={formData.amount_paid} 
                onChange={(e) => setFormData({ ...formData, amount_paid: e.target.value })} 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Remarks</label>
              <Input 
                placeholder="Cash, UPI, Bank transfer, etc" 
                value={formData.remarks} 
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} 
              />
            </div>
            <Button 
              onClick={() => setConfirmOpen(true)} 
              disabled={isSubmitting || !formData.person_id || !formData.amount_paid} 
              className="w-full"
            >
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Confirm Payment</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Record this payment? It will automatically clear pending amounts first, with any remainder saved as advance.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button onClick={handleAddPayout} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 animate-spin" /> : null}
              Record Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  )
}