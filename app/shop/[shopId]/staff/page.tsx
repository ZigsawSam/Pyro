"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, Loader2, UserRound, CreditCard, CheckCircle2 } from "lucide-react"
import { getShopToken } from "@/lib/storage-utils"
import { StaffProfileDialog } from "@/components/staff/staff-profile-dialog"
import { PayStaffDialog } from "@/components/staff/pay-staff-dialog"

interface StaffMember {
  id: number
  name: string
  phone: string
  role: string
  salary_type: string
  base_salary: number
  join_date: string
  description?: string
  account_name?: string
  account_number?: string
  bank_name?: string
  ifsc_code?: string
  upi_id?: string
  pending_payroll?: number
  paid_payroll?: number
  today_due?: number
  today_present_days?: number
  today_work_hours?: number
}

export default function StaffPage() {
  const params = useParams()
  const rawShopId = Array.isArray(params.shopId) ? params.shopId[0] : params.shopId
  const shopId = Number(rawShopId)
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null)
  const [showProfile, setShowProfile] = useState(false)
  const [showPayDialog, setShowPayDialog] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    role: "",
    salary_type: "monthly",
    base_salary: "",
    join_date: "",
    description: "",
    account_name: "",
    account_number: "",
    bank_name: "",
    ifsc_code: "",
    upi_id: "",
  })

  useEffect(() => { setIsMounted(true) }, [])

  const fetchStaff = async () => {
    try {
      const token = getShopToken()
      if (!token) {
        console.error("No auth token found")
        setIsLoading(false)
        return
      }
      const response = await fetch(`/api/shops/${shopId}/staff`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!response.ok) {
        if (response.status === 401) {
          console.error("Session expired — please log in again.")
        }
        throw new Error(`Failed to fetch staff: ${response.status}`)
      }
      const data = await response.json()
      setStaff(data.staff || [])
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { if (!isMounted) return; fetchStaff() }, [shopId, isMounted])

  const handleAddStaff = async () => {
    if (!formData.name || !formData.role || !formData.base_salary || !formData.join_date) return
    setIsSubmitting(true)
    setAddError(null)
    try {
      const token = getShopToken()
      const response = await fetch(`/api/shops/${shopId}/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          role: formData.role,
          salary_type: formData.salary_type,
          base_salary: Number(formData.base_salary),
          join_date: formData.join_date,
          description: formData.description,
          account_name: formData.account_name,
          account_number: formData.account_number,
          bank_name: formData.bank_name,
          ifsc_code: formData.ifsc_code,
          upi_id: formData.upi_id,
        }),
      })
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: "Unknown error" }))
        console.error("API Error:", errData)
        throw new Error(errData.details || errData.error || `Failed to add staff: ${response.status}`)
      }
      setShowDialog(false)
      setFormData({ name: "", phone: "", role: "", salary_type: "monthly", base_salary: "", join_date: "", description: "", account_name: "", account_number: "", bank_name: "", ifsc_code: "", upi_id: "" })
      fetchStaff()
    } catch (error: any) {
      console.error("Error:", error)
      setAddError(error.message || "Failed to add staff")
    } finally {
      setIsSubmitting(false)
    }
  }

  const openProfile = (member: StaffMember) => { setSelectedStaff(member); setShowProfile(true) }
  const openPay = (member: StaffMember) => { setSelectedStaff(member); setShowPayDialog(true) }

  if (!isMounted) {
    return (
      <MainLayout title="Staff & Payroll" shopId={shopId}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout title="Staff & Payroll" subtitle="Manage your workforce" shopId={shopId}>
      <div className="mb-6 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Tap a staff member to view profile, edit details, or process payroll.</p>
        <Button onClick={() => setShowDialog(true)} className="gap-2">
          <Plus size={18} /> Add Staff
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {staff.map((member) => {
          const pending = Number(member.pending_payroll || 0)
          const paid = Number(member.paid_payroll || 0)
          const isCleared = pending === 0 && paid > 0

          return (
            <Card
              key={member.id}
              className="group relative h-full p-5 transition hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <button
                  className="text-left"
                  onClick={() => openProfile(member)}
                >
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{member.name}</h3>
                    {isCleared && (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {member.description || "No description added yet."}
                  </p>
                </button>

                <div className="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openPay(member)}
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    Pay
                  </Button>
                </div>
              </div>

              <div className="mt-4 space-y-1 rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-sm font-medium">Pending</span>
                  <span className="text-lg font-bold text-amber-600">
                    ₹{pending.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm font-medium">Paid</span>
                  <span className="text-sm">₹{paid.toLocaleString()}</span>
                </div>
                {isCleared && (
                  <div className="mt-2 flex items-center justify-center gap-1 text-emerald-600 font-bold">
                    <span className="text-xs">✓ All Cleared</span>
                  </div>
                )}
              </div>

              <Button
                variant="ghost"
                className="mt-4 w-full justify-start gap-2"
                onClick={() => openProfile(member)}
              >
                <UserRound className="h-4 w-4" />
                View Profile
              </Button>
            </Card>
          )
        })}
      </div>

      <Dialog open={showDialog} onOpenChange={(v) => { if (!v) setAddError(null); setShowDialog(v) }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Staff Member</DialogTitle></DialogHeader>
          {addError && (
            <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {addError}
            </div>
          )}
          <div className="space-y-4">
            <Input placeholder="Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            <Input placeholder="Phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
            <Input placeholder="Role" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} />
            <select value={formData.salary_type} onChange={(e) => setFormData({ ...formData, salary_type: e.target.value })} className="w-full rounded border border-border bg-card px-3 py-2">
              <option value="monthly">Monthly</option>
              <option value="daily">Daily</option>
              <option value="hourly">Hourly</option>
            </select>
            <Input type="number" placeholder="Base Salary" value={formData.base_salary} onChange={(e) => setFormData({ ...formData, base_salary: e.target.value })} />
            <Input type="date" value={formData.join_date} onChange={(e) => setFormData({ ...formData, join_date: e.target.value })} />
            <Input placeholder="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            <Input placeholder="Account Name" value={formData.account_name} onChange={(e) => setFormData({ ...formData, account_name: e.target.value })} />
            <Input placeholder="Account Number" value={formData.account_number} onChange={(e) => setFormData({ ...formData, account_number: e.target.value })} />
            <Input placeholder="Bank Name" value={formData.bank_name} onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })} />
            <Input placeholder="IFSC Code" value={formData.ifsc_code} onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value })} />
            <Input placeholder="UPI ID" value={formData.upi_id} onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })} />
            <Button onClick={handleAddStaff} disabled={isSubmitting} className="w-full">
              {isSubmitting ? <Loader2 className="mr-2 animate-spin" /> : null}
              Add Staff
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <StaffProfileDialog open={showProfile} onOpenChange={setShowProfile} shopId={shopId} staff={selectedStaff} onUpdated={fetchStaff} onDeleted={fetchStaff} />
      <PayStaffDialog open={showPayDialog} onOpenChange={setShowPayDialog} shopId={shopId} staff={selectedStaff} onPaid={fetchStaff} />

      {staff.length === 0 && !isLoading ? (
        <Card className="mt-6 p-8 text-center text-muted-foreground">
          No staff members are added yet. Add one to start managing payroll.
        </Card>
      ) : null}
    </MainLayout>
  )
}