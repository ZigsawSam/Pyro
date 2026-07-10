"use client"

import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Loader2, Plus, Search, Phone, UserCircle, CreditCard, UserRound } from "lucide-react"
import { createShopClient } from "@/lib/supabase/shop-client"
import { MainLayout } from "@/components/layout/main-layout"
import { StaffProfileDialog } from "@/components/staff/staff-profile-dialog"
import { PayStaffDialog } from "@/components/staff/pay-staff-dialog"

interface StaffMember {
  id: number
  name: string
  phone: string
  role: string
  salary_type: string
  base_salary: number
  working_hours_per_day: number
  overtime_rate: number
  is_active: boolean
  account_name?: string
  account_number?: string
  bank_name?: string
  ifsc_code?: string
  upi_id?: string
}

interface AttendanceSummary {
  staff_id: number
  present_days: number
  half_days: number
  total_hours: number
  overtime_hours: number
}

interface PayoutRecord {
  staff_id: number
  amount_paid: number
}

export default function ShopStaffPage() {
  const supabase = createShopClient()
  const params = useParams()
  const shopId = Number(params?.shopId)
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null)
  const [showProfile, setShowProfile] = useState(false)
  const [showPayDialog, setShowPayDialog] = useState(false)
  const [attendanceSummary, setAttendanceSummary] = useState<Record<number, AttendanceSummary>>({})
  const [payoutsMap, setPayoutsMap] = useState<Record<number, number>>({})

  useEffect(() => {
    fetchStaff()
  }, [shopId])

  const fetchStaff = async () => {
    setLoading(true)
    try {
      // Fetch staff
      const { data: staffData, error: staffError } = await supabase
        .from("staff")
        .select("id, name, phone, role, salary_type, base_salary, working_hours_per_day, overtime_rate, is_active, account_name, account_number, bank_name, ifsc_code, upi_id")
        .eq("shop_id", shopId)
        .eq("is_active", true)

      if (staffError) throw staffError
      setStaff(staffData || [])

      const now = new Date()
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
      const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`

      // Fetch attendance
      const { data: attendanceData } = await supabase
        .from("attendance")
        .select("staff_id, status, work_hours, overtime_hours")
        .eq("shop_id", shopId)
        .gte("attendance_date", monthStart)
        .lte("attendance_date", monthEnd)

      const summary: Record<number, AttendanceSummary> = {}
      ;(attendanceData || []).forEach((a: any) => {
        if (!summary[a.staff_id]) {
          summary[a.staff_id] = {
            staff_id: a.staff_id,
            present_days: 0,
            half_days: 0,
            total_hours: 0,
            overtime_hours: 0,
          }
        }
        if (a.status === "present") summary[a.staff_id].present_days += 1
        if (a.status === "half") summary[a.staff_id].half_days += 1
        summary[a.staff_id].total_hours += Number(a.work_hours || 0)
        summary[a.staff_id].overtime_hours += Number(a.overtime_hours || 0)
      })
      setAttendanceSummary(summary)

      // Fetch payouts
      const { data: payoutData } = await supabase
        .from("payouts")
        .select("staff_id, amount_paid")
        .eq("shop_id", shopId)
        .eq("person_type", "staff")
        .gte("payment_date", monthStart)
        .lte("payment_date", monthEnd)

      const pMap: Record<number, number> = {}
      ;(payoutData || []).forEach((p: any) => {
        pMap[p.staff_id] = (pMap[p.staff_id] || 0) + Number(p.amount_paid || 0)
      })
      setPayoutsMap(pMap)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // Same pattern as agent: pending = calculated salary - total payouts
  const calculatePendingSalary = (member: StaffMember) => {
    const summary = attendanceSummary[member.id]
    if (!summary) return 0

    const presentDays = summary.present_days + (summary.half_days * 0.5)
    const overtimePay = summary.overtime_hours * (member.overtime_rate || 0)

    let salary = 0
    if (member.salary_type === "monthly") {
      const dailyWage = (member.base_salary || 0) / 30
      salary = (dailyWage * presentDays) + overtimePay
    } else if (member.salary_type === "daily") {
      salary = ((member.base_salary || 0) * presentDays) + overtimePay
    } else if (member.salary_type === "hourly") {
      salary = ((member.base_salary || 0) * summary.total_hours) + overtimePay
    }

    const totalPayouts = payoutsMap[member.id] || 0
    return Math.max(0, Math.round(salary - totalPayouts))
  }

  const filteredStaff = staff.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone.includes(searchQuery)
  )

  const openProfile = (member: StaffMember) => {
    setSelectedStaff(member)
    setShowProfile(true)
  }

  const openPay = (member: StaffMember) => {
    setSelectedStaff(member)
    setShowPayDialog(true)
  }

  const handleAddStaff = () => {
    setSelectedStaff(null)
    setShowProfile(true)
  }

  return (
    <MainLayout title="Staff" shopId={shopId}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Staff</h1>
        <Button onClick={handleAddStaff}>
          <Plus className="mr-2 h-4 w-4" /> Add Staff
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search staff..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {filteredStaff.map((member) => {
            const pendingSalary = calculatePendingSalary(member)
            const summary = attendanceSummary[member.id]

            return (
              <Card key={member.id} className="p-4 group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <UserCircle className="h-10 w-10 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {member.phone}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {member.role} • {member.salary_type} • ₹{Number(member.base_salary).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">₹{pendingSalary.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">pending</p>
                    {summary && (
                      <p className="text-xs text-muted-foreground">
                        {summary.present_days}P {summary.half_days}H • {summary.total_hours}hrs
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm" onClick={() => openProfile(member)}>
                    <UserRound className="mr-1 h-3 w-3" /> Profile
                  </Button>
                  <Button size="sm" onClick={() => openPay(member)} disabled={pendingSalary === 0}>
                    <CreditCard className="mr-1 h-3 w-3" /> Pay
                  </Button>
                </div>
              </Card>
            )
          })}
          {filteredStaff.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No staff found.</p>
          )}
        </div>
      )}

      <StaffProfileDialog
        open={showProfile}
        onOpenChange={setShowProfile}
        shopId={shopId}
        staff={selectedStaff}
        onUpdated={() => {
          setShowProfile(false)
          fetchStaff()
        }}
        onDeleted={() => {
          setShowProfile(false)
          fetchStaff()
        }}
      />

      <PayStaffDialog
        open={showPayDialog}
        onOpenChange={setShowPayDialog}
        shopId={shopId}
        staff={selectedStaff ? {
          id: selectedStaff.id,
          name: selectedStaff.name,
          pending_salary: calculatePendingSalary(selectedStaff),
          account_name: selectedStaff.account_name,
          account_number: selectedStaff.account_number,
          bank_name: selectedStaff.bank_name,
          ifsc_code: selectedStaff.ifsc_code,
          upi_id: selectedStaff.upi_id,
        } : null}
        onPaid={() => {
          setShowPayDialog(false)
          fetchStaff()
        }}
      />
    </MainLayout>
  )
}
