"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Pencil, Trash2, Receipt } from "lucide-react"
import { createShopClient } from "@/lib/supabase/shop-client"

interface StaffProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shopId: number
  staff: {
    id: number
    name: string
    phone: string
    role: string
    salary_type: string
    base_salary: number
    working_hours_per_day: number
    overtime_rate: number
    upi_id?: string
    account_name?: string
    account_number?: string
    bank_name?: string
    ifsc_code?: string
    description?: string
    join_date?: string
  } | null
  onUpdated: () => void
  onDeleted: () => void
}

interface PayoutRecord {
  id: number
  amount_paid: number
  payment_date: string
  remarks: string
}

interface AttendanceRecord {
  id: number
  attendance_date: string
  status: string
  work_hours: number
  overtime_hours: number
}

export function StaffProfileDialog({ open, onOpenChange, shopId, staff, onUpdated, onDeleted }: StaffProfileDialogProps) {
  const supabase = createShopClient()
  const [payouts, setPayouts] = useState<PayoutRecord[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    if (!open || !staff) return

    const fetchData = async () => {
      setLoading(true)
      try {
        const now = new Date()
        const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`

        // Fetch payouts
        const { data: payoutData } = await supabase
          .from("payouts")
          .select("id, amount_paid, payment_date, remarks")
          .eq("shop_id", shopId)
          .eq("staff_id", staff.id)
          .eq("person_type", "staff")
          .gte("payment_date", monthStart)
          .order("payment_date", { ascending: false })

        setPayouts(payoutData || [])

        // Fetch attendance
        const { data: attData } = await supabase
          .from("attendance")
          .select("id, attendance_date, status, work_hours, overtime_hours")
          .eq("shop_id", shopId)
          .eq("staff_id", staff.id)
          .gte("attendance_date", monthStart)
          .order("attendance_date", { ascending: false })

        setAttendance(attData || [])
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [open, staff, shopId, supabase])

  if (!staff) return null

  // OPTION B: Calculate from attendance and payouts
  const presentDays = attendance.filter(a => a.status === "present").length
  const halfDays = attendance.filter(a => a.status === "half").length
  const totalWorkHours = attendance.reduce((sum, a) => sum + Number(a.work_hours || 0), 0)
  const totalOvertime = attendance.reduce((sum, a) => sum + Number(a.overtime_hours || 0), 0)

  const dailyWage = Number(staff.base_salary || 0) / 30
  const calculatedSalary = (dailyWage * presentDays) + (dailyWage * 0.5 * halfDays) + (Number(staff.overtime_rate || 0) * totalOvertime)

  const totalPaid = payouts.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0)
  const pendingPayroll = Math.max(0, calculatedSalary - totalPaid)
  const advanceTaken = Math.max(0, totalPaid - calculatedSalary)

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this staff member?")) return
    try {
      const { error } = await supabase.from("staff").delete().eq("id", staff.id)
      if (error) throw error
      onDeleted()
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{staff.name}</DialogTitle>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(!isEditing)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-red-600" onClick={handleDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {staff.description || "No description added yet."}
            </div>

            <div className="rounded-lg border p-4 space-y-2 text-sm">
              <p><span className="font-medium">Role:</span> {staff.role}</p>
              <p><span className="font-medium">Salary Type:</span> {staff.salary_type}</p>
              <p><span className="font-medium">Base Salary:</span> ₹{Number(staff.base_salary).toLocaleString()}</p>
              <p><span className="font-medium">Working Hours/Day:</span> {staff.working_hours_per_day} hrs</p>
              <p><span className="font-medium">Overtime Rate:</span> ₹{staff.overtime_rate}/hr</p>
              <p><span className="font-medium">Amount to be paid today:</span> ₹{Math.round(pendingPayroll)}</p>
              <p><span className="font-medium">Today present days / hours:</span> {presentDays} / {totalWorkHours}h</p>
              <p><span className="font-medium">Pending Payroll:</span> ₹{Math.round(pendingPayroll)}</p>
              <p><span className="font-medium">Paid Payroll:</span> ₹{Math.round(totalPaid)}</p>
              <p><span className="font-medium">Account:</span> {staff.account_number ? `${staff.bank_name} - ${staff.account_number}` : "Not added"}</p>
              <p><span className="font-medium">UPI:</span> {staff.upi_id || "Not added"}</p>
            </div>

            {payouts.length > 0 && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Receipt className="h-4 w-4 text-yellow-700" />
                  <h4 className="font-semibold text-yellow-800">Advances Taken</h4>
                </div>
                <div className="space-y-2">
                  {payouts.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-sm">
                      <span>{p.payment_date}</span>
                      <span className="font-medium">₹{Number(p.amount_paid).toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground">{p.remarks}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-2 border-t border-yellow-200 flex items-center justify-between">
                  <span className="font-semibold text-yellow-800">Total Advance</span>
                  <span className="font-bold text-yellow-800">₹{Math.round(advanceTaken).toLocaleString()}</span>
                </div>
                {pendingPayroll > 0 && (
                  <div className="mt-1 text-xs text-yellow-700">
                    Pending: ₹{Math.round(pendingPayroll)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
