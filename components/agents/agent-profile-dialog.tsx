"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Pencil, Trash2, Wallet, CheckCircle2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface AgentProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shopId: number
  agent: any | null
  onUpdated: () => void
  onDeleted: () => void
}

export function AgentProfileDialog({ open, onOpenChange, shopId, agent, onUpdated, onDeleted }: AgentProfileDialogProps) {
  const supabase = createClient()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [advances, setAdvances] = useState<any[]>([])
  const [formData, setFormData] = useState({
    name: "",
    phone_number: "",
    description: "",
    commission_rate: "",
    account_name: "",
    account_number: "",
    bank_name: "",
    ifsc_code: "",
    upi_id: "",
  })

  useEffect(() => {
    if (!agent) return
    setFormData({
      name: agent.name || "",
      phone_number: agent.phone_number || "",
      description: agent.description || "",
      commission_rate: agent.commission_rate?.toString() || "",
      account_name: agent.account_name || "",
      account_number: agent.account_number || "",
      bank_name: agent.bank_name || "",
      ifsc_code: agent.ifsc_code || "",
      upi_id: agent.upi_id || "",
    })
    setIsEditing(false)
    fetchAdvances()
  }, [agent, open])

  const fetchAdvances = async () => {
    if (!agent) return
    try {
      const { data, error } = await supabase
        .from("payouts")
        .select("*")
        .eq("shop_id", shopId)
        .eq("person_id", agent.id)
        .eq("person_type", "agent")
        .eq("is_advance", true)
        .order("payment_date", { ascending: false })

      if (error) throw error
      setAdvances(data || [])
    } catch (error) {
      console.error(error)
    }
  }

  const handleSave = async () => {
    if (!agent) return
    setIsSaving(true)
    try {
      // Update agent profile
      const { error: agentError } = await supabase
        .from("agents")
        .update({
          name: formData.name,
          phone_number: formData.phone_number,
          description: formData.description,
          account_name: formData.account_name,
          account_number: formData.account_number,
          bank_name: formData.bank_name,
          ifsc_code: formData.ifsc_code,
          upi_id: formData.upi_id,
        })
        .eq("id", agent.id)

      if (agentError) throw agentError

      // Update commission rate in shop_agents
      const { error: linkError } = await supabase
        .from("shop_agents")
        .update({ commission_rate: Number.parseFloat(formData.commission_rate) })
        .eq("id", agent.link_id)
        .eq("shop_id", shopId)

      if (linkError) throw linkError

      onUpdated()
      onOpenChange(false)
    } catch (error) {
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!agent) return
    if (!window.confirm("Remove this agent from this shop and keep their sales history intact?")) return
    setIsDeleting(true)
    try {
      // Delete shop_agent link
      const { error } = await supabase
        .from("shop_agents")
        .delete()
        .eq("id", agent.link_id)
        .eq("shop_id", shopId)

      if (error) throw error
      onDeleted()
      onOpenChange(false)
    } catch (error) {
      console.error(error)
    } finally {
      setIsDeleting(false)
    }
  }

  if (!agent) return null

  const pending = Number(agent.pending_commission || 0)
  const totalCommission = Number(agent.total_commission || 0)
  const isCleared = pending === 0 && totalCommission > 0
  const totalAdvance = advances.reduce((sum, a) => sum + Number(a.amount_paid || 0), 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {agent.name}
            {isCleared ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : null}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Shop agent profile</p>
              <p className="text-sm">{agent.description || "No description added yet."}</p>
            </div>
            <div className="flex gap-2">
              {!isEditing ? (
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </Button>
              ) : null}
              <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Delete
              </Button>
            </div>
          </div>

          {isEditing ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Name</label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Phone</label>
                <Input value={formData.phone_number} onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">Description</label>
                <Input placeholder="Describe this agent" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Commission Rate (%)</label>
                <Input type="number" step="0.1" value={formData.commission_rate} onChange={(e) => setFormData({ ...formData, commission_rate: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Account Name</label>
                <Input value={formData.account_name} onChange={(e) => setFormData({ ...formData, account_name: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Account Number</label>
                <Input value={formData.account_number} onChange={(e) => setFormData({ ...formData, account_number: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Bank Name</label>
                <Input value={formData.bank_name} onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">IFSC</label>
                <Input value={formData.ifsc_code} onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">UPI ID</label>
                <Input value={formData.upi_id} onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })} />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/20 p-4 text-sm space-y-2">
                <p><span className="font-medium">Commission Rate:</span> {agent.commission_rate}%</p>
                <p><span className="font-medium">Total Commission:</span> ₹{Number(totalCommission).toLocaleString()}</p>
                <p><span className="font-medium">Pending Commission:</span> ₹{pending.toLocaleString()}</p>
                <p><span className="font-medium">Paid Commission:</span> ₹{Number(agent.paid_commission || 0).toLocaleString()}</p>
                <p><span className="font-medium">Account:</span> {agent.account_name || "Not added"}</p>
                {agent.upi_id ? <p><span className="font-medium">UPI:</span> {agent.upi_id}</p> : null}
              </div>

              {/* Advance Section */}
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="h-4 w-4 text-amber-700" />
                  <h4 className="text-sm font-semibold text-amber-800">Advances Taken</h4>
                </div>
                {totalAdvance > 0 ? (
                  <div className="space-y-2">
                    {advances.map((adv) => (
                      <div key={adv.id} className="flex justify-between text-sm">
                        <span>{new Date(adv.payment_date).toLocaleDateString()}</span>
                        <span className="font-medium">₹{Number(adv.amount_paid).toLocaleString()}</span>
                        <span className="text-muted-foreground">{adv.remarks || "Advance"}</span>
                      </div>
                    ))}
                    <div className="border-t border-amber-200 pt-2 flex justify-between font-bold text-amber-900">
                      <span>Total Advance</span>
                      <span>₹{totalAdvance.toLocaleString()}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-amber-700">No advances taken.</p>
                )}
              </div>
            </div>
          )}

          {isEditing ? (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Changes
              </Button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}