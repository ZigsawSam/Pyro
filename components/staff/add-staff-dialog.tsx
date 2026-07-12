"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, AlertCircle } from "lucide-react"
import { createShopClient } from "@/lib/supabase/shop-client"
import { toast } from "sonner"

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
    department: "Sales",
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
    email: "",
  })

  // Dynamic salary label and placeholder based on salary type
  const salaryConfig = {
    monthly: { label: "Base Monthly Salary (₹)*", placeholder: "15000" },
    daily: { label: "Daily Rate (₹)*", placeholder: "800" },
    hourly: { label: "Hourly Rate (₹)*", placeholder: "150" },
  }

  const currentConfig = salaryConfig[formData.salary_type as keyof typeof salaryConfig] || salaryConfig.monthly

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
          department: formData.department,
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
          joining_date: formData.joining_date,
          email: formData.email,
        })

      if (insertError) throw new Error(insertError.message)

      toast.success("Staff added successfully")
      onOpenChange(false)
      onStaffAdded()
      setFormData({
        name: "",
        phone: "",
        role: "",
        department: "Sales",
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
        email: "",
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
          <DialogTitle>Onboard New Staff Employee</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="space-y-5">
          {/* Basic Info */}
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">Full Employee Name*</label>
              <Input 
                placeholder="e.g. Karan Singh" 
                value={formData.name} 
                onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                className="bg-slate-50 border-slate-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">Designation / Role*</label>
                <Input 
                  placeholder="e.g. Senior Sales Representative" 
                  value={formData.role} 
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })} 
                  className="bg-slate-50 border-slate-200"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">Department*</label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Sales">Sales</option>
                  <option value="Operations">Operations</option>
                  <option value="Support">Support</option>
                  <option value="Logistics">Logistics</option>
                  <option value="Accounts">Accounts</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">Onboarding Date</label>
                <Input 
                  type="date" 
                  value={formData.joining_date} 
                  onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })} 
                  className="bg-slate-50 border-slate-200"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">Contact Phone*</label>
                <Input 
                  placeholder="e.g. +91 99988 87776" 
                  value={formData.phone} 
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
                  className="bg-slate-50 border-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">Email Address</label>
              <Input 
                placeholder="you@domain.com" 
                value={formData.email} 
                onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                className="bg-slate-50 border-slate-200"
              />
            </div>
          </div>

          {/* Salary Configuration */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-blue-500">Salary Configuration</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">Payroll Cycle Type</label>
                <select
                  value={formData.salary_type}
                  onChange={(e) => {
                    const newType = e.target.value
                    const defaults = { monthly: "15000", daily: "800", hourly: "150" }
                    setFormData({ 
                      ...formData, 
                      salary_type: newType,
                      base_salary: defaults[newType as keyof typeof defaults] || ""
                    })
                  }}
                  className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="monthly">Monthly Fixed</option>
                  <option value="daily">Daily Wage</option>
                  <option value="hourly">Hourly Wage</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">{currentConfig.label}</label>
                <Input 
                  type="number" 
                  placeholder={currentConfig.placeholder}
                  value={formData.base_salary} 
                  onChange={(e) => setFormData({ ...formData, base_salary: e.target.value })} 
                  className="bg-white border-slate-200"
                />
              </div>
            </div>
          </div>

          {/* Settlement Ledger & Banking */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-blue-500">Settlement Ledger & Banking</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">Bank Name</label>
                <Input 
                  placeholder="e.g. State Bank of India" 
                  value={formData.bank_name} 
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })} 
                  className="bg-white border-slate-200"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">Account Number</label>
                <Input 
                  placeholder="e.g. 123456789012" 
                  value={formData.account_number} 
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })} 
                  className="bg-white border-slate-200"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">IFSC Code</label>
                <Input 
                  placeholder="e.g. SBIN0001234" 
                  value={formData.ifsc_code} 
                  onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value })} 
                  className="bg-white border-slate-200"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">UPI Address (UPI ID)</label>
                <Input 
                  placeholder="e.g. karan@upi" 
                  value={formData.upi_id} 
                  onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })} 
                  className="bg-white border-slate-200"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-100">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-slate-200 text-slate-600">Cancel</Button>
          <Button 
            onClick={handleAddStaff} 
            disabled={isLoading || !formData.name || !formData.phone || !formData.role || !formData.base_salary}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Finalize Onboarding
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}