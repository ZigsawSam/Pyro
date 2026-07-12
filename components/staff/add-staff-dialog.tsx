"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, AlertCircle } from "lucide-react"
import { createShopClient } from "@/lib/supabase/shop-client"

interface AddStaffDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onStaffAdded: () => void
  shopId: number
}

export function AddStaffDialog({ open, onOpenChange, onStaffAdded, shopId }: AddStaffDialogProps) {
  const supabase = createShopClient()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

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
    joining_date: new Date().toISOString().split("T")[0],
  })

  const handleAddStaff = async () => {
    setError("")
    setIsLoading(true)

    try {
      const { error: insertError } = await supabase
  .from("staff")
  .insert({
    shop_id: shopId,
    name: formData.name,
    phone: formData.phone,
    role: formData.role,
    salary_type: formData.salary_type,
    base_salary: Number.parseFloat(formData.base_salary) || 0,
    working_hours_per_day: Number.parseInt(formData.working_hours_per_day) || 8,
    overtime_rate: Number.parseFloat(formData.overtime_rate) || 0,
    description: formData.description,
    account_name: formData.account_name,
    account_number: formData.account_number,
    bank_name: formData.bank_name,
    ifsc_code: formData.ifsc_code,
    upi_id: formData.upi_id,
    is_active: true,
    joining_date: new Date().toISOString().split("T")[0],  // ← ADD THIS
  })

      if (insertError) throw new Error(insertError.message)

      onOpenChange(false)
      onStaffAdded()
      setFormData({
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
        joining_date: new Date().toISOString().split("T")[0],
      })
    } catch (err: any) {
      setError(err.message || "An error occurred")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Staff Member</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded flex gap-2">
            <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Name</label>
            <Input placeholder="Staff name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Phone</label>
            <Input placeholder="9876543210" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Role</label>
            <Input placeholder="Manager, Sales, etc." value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Joining Date</label>
            <Input 
            type="date" 
            value={formData.joining_date} 
            onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })} 
            />
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
            <label className="mb-1 block text-sm font-medium">
              {formData.salary_type === "monthly" ? "Monthly Salary" : formData.salary_type === "daily" ? "Daily Rate" : "Hourly Rate"}
            </label>
            <Input type="number" placeholder="5000" value={formData.base_salary} onChange={(e) => setFormData({ ...formData, base_salary: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Working Hours/Day</label>
            <Input type="number" value={formData.working_hours_per_day} onChange={(e) => setFormData({ ...formData, working_hours_per_day: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Overtime Rate (₹/hr)</label>
            <Input type="number" value={formData.overtime_rate} onChange={(e) => setFormData({ ...formData, overtime_rate: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium">Description</label>
            <Input placeholder="Describe this staff member" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
          </div>
          <div className="md:col-span-2 mt-2 border-t pt-3">
            <p className="mb-2 text-sm font-medium">Bank Details (Optional)</p>
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

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAddStaff} disabled={isLoading || !formData.name || !formData.phone || !formData.role || !formData.base_salary}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Add Staff
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
