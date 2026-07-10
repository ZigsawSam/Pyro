"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search, User, Phone, Wallet, CalendarDays } from "lucide-react"
import { createShopClient } from "@/lib/supabase/shop-client"
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
  upi_id?: string
  account_name?: string
  account_number?: string
  bank_name?: string
  ifsc_code?: string
  is_active: boolean
}

interface AttendanceRecord {
  staff_id: number
  status: string
  work_hours: number
  overtime_hours: number
}

interface PayoutRecord {
  staff_id: number
  amount_paid: number
  payment_date: string
}

// Type for PayStaffDialog - includes pending_salary
interface PayStaffData {
  id: number
  name: string
  pending_salary: number
  account_name?: string
  account_number?: string
  bank_name?: string
  ifsc_code?: string
  upi_id?: string
}

export default function StaffPage({ params }: { params: { shopId: string } }) {
  const shopId = Number(params.shopId)
  const supabase = createShopClient()
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [payouts, setPayouts] = useState<PayoutRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showProfile, setShowProfile] = useState(false)
  const [showPayDialog, setShowPayDialog] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null)
  const [payStaffData, setPayStaffData] = useState<PayStaffData | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: staffData, error: staffError } = await supabase
        .from("staff")
        .select("*")
        .eq("shop_id", shopId)
        .eq("is_active", true)
        .order("name")

      if (staffError) throw staffError
      setStaff(staffData || [])

      const now = new Date()
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`

      const { data: attData, error: attError } = await supabase
        .from("attendance")
        .select("staff_id, status, work_hours, overtime_hours")
        .eq("shop_id", shopId)
        .gte("attendance_date", monthStart)

      if (attError) throw attError
      setAttendance(attData || [])

      const { data: payoutData, error: payoutError } = await supabase
        .from("payouts")
        .select("staff_id, amount_paid, payment_date")
        .eq("shop_id", shopId)
        .eq("person_type", "staff")
        .gte("payment_date", monthStart)

      if (payoutError) throw payoutError
      setPayouts(payoutData || [])
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [shopId])

  const calculatePendingSalary = (s: StaffMember) => {
    const staffAttendance = attendance.filter(a => a.staff_id === s.id)
    const presentDays = staffAttendance.filter(a => a.status === "present").length
    const halfDays = staffAttendance.filter(a => a.status === "half").length
    const totalOvertime = staffAttendance.reduce((sum, a) => sum + Number(a.overtime_hours || 0), 0)

    const dailyWage = Number(s.base_salary || 0) / 30
    const attendanceSalary = (dailyWage * presentDays) + (dailyWage * 0.5 * halfDays) + (Number(s.overtime_rate || 0) * totalOvertime)

    const totalPayouts = payouts
      .filter(p => p.staff_id === s.id)
      .reduce((sum, p) => sum + Number(p.amount_paid || 0), 0)

    return Math.max(0, attendanceSalary - totalPayouts)
  }

  const calculateAdvance = (s: StaffMember) => {
    const staffAttendance = attendance.filter(a => a.staff_id === s.id)
    const presentDays = staffAttendance.filter(a => a.status === "present").length
    const halfDays = staffAttendance.filter(a => a.status === "half").length
    const totalOvertime = staffAttendance.reduce((sum, a) => sum + Number(a.overtime_hours || 0), 0)

    const dailyWage = Number(s.base_salary || 0) / 30
    const attendanceSalary = (dailyWage * presentDays) + (dailyWage * 0.5 * halfDays) + (Number(s.overtime_rate || 0) * totalOvertime)

    const totalPayouts = payouts
      .filter(p => p.staff_id === s.id)
      .reduce((sum, p) => sum + Number(p.amount_paid || 0), 0)

    return Math.max(0, totalPayouts - attendanceSalary)
  }

  const getAttendanceSummary = (s: StaffMember) => {
    const staffAttendance = attendance.filter(a => a.staff_id === s.id)
    const presentDays = staffAttendance.filter(a => a.status === "present").length
    const halfDays = staffAttendance.filter(a => a.status === "half").length
    const totalHours = staffAttendance.reduce((sum, a) => sum + Number(a.work_hours || 0), 0)
    return { presentDays, halfDays, totalHours }
  }

  const handlePayClick = (s: StaffMember) => {
    const pending = calculatePendingSalary(s)
    setSelectedStaff(s)
    setPayStaffData({
      id: s.id,
      name: s.name,
      pending_salary: pending,
      account_name: s.account_name,
      account_number: s.account_number,
      bank_name: s.bank_name,
      ifsc_code: s.ifsc_code,
      upi_id: s.upi_id,
    })
    setShowPayDialog(true)
  }

  const filteredStaff = staff.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.phone.includes(search)
  )

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Staff</h1>
        <Button onClick={() => { setSelectedStaff(null); setShowProfile(true) }}>
          + Add Staff
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search staff..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : filteredStaff.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No staff found.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredStaff.map((s) => {
            const pending = calculatePendingSalary(s)
            const advance = calculateAdvance(s)
            const { presentDays, halfDays, totalHours } = getAttendanceSummary(s)

            return (
              <Card key={s.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{s.name}</h3>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {s.phone}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline">{s.role}</Badge>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    {s.salary_type} • ₹{Number(s.base_salary).toLocaleString()}
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold">₹{Math.round(pending).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">pending</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {presentDays}P {halfDays}H • {totalHours}hrs
                      </div>
                      {advance > 0 && (
                        <p className="text-orange-600">Advance: ₹{Math.round(advance)}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 gap-1"
                      onClick={() => { setSelectedStaff(s); setShowProfile(true) }}
                    >
                      <User className="h-3 w-3" /> Profile
                    </Button>
                    <Button 
                      size="sm" 
                      className="flex-1 gap-1"
                      onClick={() => handlePayClick(s)}
                    >
                      <Wallet className="h-3 w-3" /> Pay
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <StaffProfileDialog
        open={showProfile}
        onOpenChange={setShowProfile}
        shopId={shopId}
        staff={selectedStaff}
        onUpdated={() => { fetchData(); setShowProfile(false) }}
        onDeleted={() => { fetchData(); setShowProfile(false) }}
      />

      <PayStaffDialog
        open={showPayDialog}
        onOpenChange={setShowPayDialog}
        shopId={shopId}
        staff={payStaffData}
        onPaid={() => {
          setShowPayDialog(false)
          fetchData()
        }}
      />
    </div>
  )
}
