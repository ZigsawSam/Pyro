"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Pencil, Trash2, CheckCircle2, Wallet } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface StaffProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shopId: number
  staff: any | null
  onUpdated: () => void
  onDeleted: () => void
}

export function StaffProfileDialog({ open, onOpenChange, shopId, staff, onUpdated, onDeleted }: StaffProfileDialogProps) {
  const supabase = createClient()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [advances, setAdvances] = useState<any[]>([])
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    role: "",
    salary_type: "monthly",
    base_salary: "",
    working_hours_per_day: "8",
    overtime_rate: "0",
    description: "",
    account_name: "",
    account_number: "",
    bank_name: "",
    ifsc_code: "",
    upi_id: "",
  })

  useEffect(() => {
    if (!staff) return
    setFormData({
      name: staff.name || "",
      phone: staff.phone || "",
      role: staff.role || "",
      salary_type: staff.salary_type || "monthly",
      base_salary: staff.base_salary?.toString() || "",
      working_hours_per_day: staff.working_hours_per_day?.toString() || "8",
      overtime_rate: staff.overtime_rate?.toString() || "0",
      description: staff.description || "",
      account_name: staff.account_name || "",
      account_number: staff.account_number || "",
      bank_name: staff.bank_name || "",
      ifsc_code: staff.ifsc_code || "",
      upi_id: staff.upi_id || "",
    })
    setIsEditing(false)
    fetchAdvances()
  }, [staff, open])

  const fetchAdvances = async () => {
    if (!staff) return
    try {
      const { data, error } = await supabase
        .from("payouts")
        .select("*")
        .eq("shop_id", shopId)
        .eq("staff_id", staff.id)
        .eq("person_type", "staff")
        
        .order("payment_date", { ascending: false })

      if (error) throw error
      setAdvances(data || [])
    } catch (error) {
      console.error(error)
    }
  }

  const handleSave = async () => {
    if (!staff) return
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from("staff")
        .update({
          name: formData.name,
          phone: formData.phone,
          role: formData.role,
          salary_type: formData.salary_type,
          base_salary: Number(formData.base_salary),
          description: formData.description,
          account_name: formData.account_name,
          account_number: formData.account_number,
          bank_name: formData.bank_name,
          ifsc_code: formData.ifsc_code,
          upi_id: formData.upi_id,
        })
        .eq("id", staff.id)
        .eq("shop_id", shopId)

      if (error) throw error
      onUpdated()
      onOpenChange(false)
    } catch (error) {
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!staff) return
    if (!window.confirm("Remove this staff member from the shop while keeping payroll history?")) return
    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from("staff")
        .delete()
        .eq("id", staff.id)
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

  if (!staff) return null

  const pending = Number(staff.pending_payroll || 0)
  const paid = Number(staff.paid_payroll || 0)
  const totalAdvance = advances.reduce((sum, a) => sum + Number(a.amount_paid || 0), 0)
  const isCleared = pending === 0 && paid > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {staff.name}
            {isCleared ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : null}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Staff profile</p>
              <p className="text-sm">{staff.description || "No description added yet."}</p>
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
                <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Role</label>
                <Input value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Salary Type</label>
                <select
                  value={formData.salary_type}
                  onChange={(e) => setFormData({ ...formData, salary_type: e.target.value })}
                  className="w-full rounded border border-input bg-background px-3 py-2"
                >
                  <option value="monthly">Monthly</option>
                  <option value="daily">Daily</option>
                  <option value="hourly">Hourly</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Base Salary</label>
                <Input type="number" value={formData.base_salary} onChange={(e) => setFormData({ ...formData, base_salary: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">Description</label>
                <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
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
                <p><span className="font-medium">Role:</span> {staff.role}</p>
                <p><span className="font-medium">Salary Type:</span> {staff.salary_type}</p>
                <p><span className="font-medium">Base Salary:</span> ₹{Number(staff.base_salary || 0).toLocaleString()}</p>
                <p><span className="font-medium">Working Hours/Day:</span> {staff.working_hours_per_day || 8} hrs</p>
                <p><span className="font-medium">Overtime Rate:</span> ₹{staff.overtime_rate || 0}/hr</p>
                <p><span className="font-medium">Amount to be paid today:</span> ₹{Number(staff.today_due || 0).toLocaleString()}</p>
                <p><span className="font-medium">Today present days / hours:</span> {Number(staff.today_present_days || 0)} / {Number(staff.today_work_hours || 0)}h</p>
                <p><span className="font-medium">Pending Payroll:</span> ₹{pending.toLocaleString()}</p>
                <p><span className="font-medium">Paid Payroll:</span> ₹{paid.toLocaleString()}</p>
                <p><span className="font-medium">Account:</span> {staff.account_name || "Not added"}</p>
                {staff.upi_id ? <p><span className="font-medium">UPI:</span> {staff.upi_id}</p> : null}
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