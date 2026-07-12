"use client"

import { useEffect, useState, useCallback, useMemo } from "react"  // ← FIXED: added useMemo
import {
  Users,
  Search,
  PlusCircle,
  Edit,
  Archive,
  X,
  UserPlus,
  Mail,
  Phone,
  CreditCard,
  Building,
  Loader2,
  UserRound,
  Check,
  RotateCcw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { createShopClient } from "@/lib/supabase/shop-client"
import { MainLayout } from "@/components/layout/main-layout"
import { StaffProfileDialog } from "@/components/staff/staff-profile-dialog"
import { PayStaffDialog } from "@/components/staff/pay-staff-dialog"
import { AddStaffDialog } from "@/components/staff/add-staff-dialog"

/* ─────────────────────────────────────────────────────────────
   TYPES
   ───────────────────────────────────────────────────────────── */

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
  joining_date?: string
  email?: string
  department?: string
  employee_id?: string
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
  status?: string
}

type StatusFilter = "active" | "archived"

interface ShopStaffPageProps {
  shopId: string
  user?: any
}

/* ─────────────────────────────────────────────────────────────
   COMPONENT
   ───────────────────────────────────────────────────────────── */

export function ShopStaffPage({ shopId: shopIdProp, user }: ShopStaffPageProps) {
  const supabase = createShopClient()
  const shopId = parseInt(shopIdProp, 10)

  /* ── State ── */
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [deptFilter, setDeptFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active")

  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null)
  const [showProfile, setShowProfile] = useState(false)
  const [showPayDialog, setShowPayDialog] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)

  const [attendanceSummary, setAttendanceSummary] = useState<Record<number, AttendanceSummary>>({})
  const [payoutsMap, setPayoutsMap] = useState<Record<number, number>>({})

  /* ── Data Fetching ── */
    const fetchStaff = useCallback(async () => {
    if (isNaN(shopId)) return
    setLoading(true)
    try {
      const { data: staffData, error: staffError } = await supabase
        .from("staff")
        .select("id, name, phone, role, salary_type, base_salary, working_hours_per_day, overtime_rate, is_active, account_name, account_number, bank_name, ifsc_code, upi_id")
        .eq("shop_id", shopId)

      if (staffError) throw staffError

      const now = new Date()
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
      const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`

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

      setStaff(staffData || [])
    } catch (e: any) {
      console.error("Staff fetch error:", e)
      toast.error(e?.message || "Failed to load staff data")
    } finally {
      setLoading(false)
    }
  }, [shopId, supabase])

  useEffect(() => {
    fetchStaff()
  }, [fetchStaff])

  /* ── Computed ── */
  const calculatePendingSalary = useCallback((member: StaffMember) => {
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
  }, [attendanceSummary, payoutsMap])

  const departments = useMemo(() => {
    const depts = new Set<string>()
    staff.forEach((s) => {
      if (s.department) depts.add(s.department)
    })
    return Array.from(depts).sort()
  }, [staff])

  const filteredStaff = useMemo(() => {
    return staff.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.employee_id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.phone.includes(searchQuery)
      const matchesDept = deptFilter === "all" || s.department === deptFilter
      const matchesStatus =
        statusFilter === "active" ? s.is_active : !s.is_active
      return matchesSearch && matchesDept && matchesStatus
    })
  }, [staff, searchQuery, deptFilter, statusFilter])

  /* ── Actions ── */
  const handleToggleArchive = async (member: StaffMember) => {
    const action = member.is_active ? "archive" : "restore"
    const confirmation = window.confirm(
      `Are you sure you want to ${action} ${member.name}?`
    )
    if (!confirmation) return

    try {
      const { error } = await supabase
        .from("staff")
        .update({ is_active: !member.is_active })
        .eq("id", member.id)

      if (error) throw error

      toast.success(`${member.name} ${action}d successfully`)
      fetchStaff()
    } catch (err: any) {
      toast.error(err.message || `Failed to ${action}`)
    }
  }

  const openProfile = (member: StaffMember) => {
    setSelectedStaff(member)
    setShowProfile(true)
  }

  const openPay = (member: StaffMember) => {
    setSelectedStaff(member)
    setShowPayDialog(true)
  }

  const handleAddStaff = () => {
    setShowAddDialog(true)
  }

  /* ── Render ── */
  if (loading) {
    return (
      <MainLayout title="Staff & Payroll" subtitle="Manage staff and process payroll" shopId={shopId}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout title="Staff & Payroll" subtitle="Manage staff and process payroll" shopId={shopId}>
      <div className="space-y-6">

        {/* ═══════════════════════════════════════════════════════
            HEADER BANNER
            ═══════════════════════════════════════════════════════ */}
        <div className="flex items-center justify-between bg-slate-900 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-400/30">
              <Users className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Staff Administration</h1>
              <p className="text-sm text-slate-400">
                Manage salaries, position hierarchies, and active employment statuses.
              </p>
            </div>
          </div>
          <Button
            onClick={handleAddStaff}
            className="gap-2 bg-blue-500 hover:bg-blue-600 text-white"
          >
            <UserPlus className="h-4 w-4" />
            Onboard Employee
          </Button>
        </div>

        {/* ═══════════════════════════════════════════════════════
            FILTER PANEL
            ═══════════════════════════════════════════════════════ */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <div className="relative w-full md:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by name, ID, title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-50 border-slate-200"
            />
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
            {/* Department filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-600 outline-none border-none py-0.5 cursor-pointer"
              >
                <option value="all">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Status filter toggler */}
            <div className="flex bg-slate-50 border border-slate-200 p-0.5 rounded-lg">
              <button
                onClick={() => setStatusFilter("active")}
                className={`px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all ${
                  statusFilter === "active"
                    ? "bg-blue-500 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setStatusFilter("archived")}
                className={`px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all ${
                  statusFilter === "archived"
                    ? "bg-amber-500 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Archived
              </button>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════
            STAFF MASTER TABLE
            ═══════════════════════════════════════════════════════ */}
        <Card className="bg-white border border-slate-200 overflow-hidden rounded-2xl shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left px-6 py-3 font-medium text-slate-500 uppercase text-xs tracking-wider">
                      Employee Code
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 uppercase text-xs tracking-wider">
                      Full Name
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 uppercase text-xs tracking-wider">
                      Department
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 uppercase text-xs tracking-wider">
                      Salary Profile
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 uppercase text-xs tracking-wider">
                      Phone & Email
                    </th>
                    <th className="text-right px-6 py-3 font-medium text-slate-500 uppercase text-xs tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400 font-mono text-xs">
                        No employees matching the criteria found.
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map((member) => (
                      <tr
                        key={member.id}
                        className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-all"
                      >
                        {/* Employee Code */}
                        <td className="px-6 py-4 font-mono font-bold text-slate-400 text-xs">
                          {member.employee_id || `EMP${String(member.id).padStart(3, "0")}`}
                        </td>

                        {/* Full Name */}
                        <td className="px-4 py-4">
                          <div className="font-semibold text-slate-900 text-sm">
                            {member.name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {member.role}
                          </div>
                        </td>

                        {/* Department */}
                        <td className="px-4 py-4">
                          <Badge
                            variant="outline"
                            className="text-[10px] border-slate-200 text-slate-500 bg-slate-50"
                          >
                            {member.role || "General"}
                          </Badge>
                        </td>

                        {/* Salary Profile */}
                        <td className="px-4 py-4">
                          <div className="font-bold text-slate-900 text-sm">
                            ₹{Number(member.base_salary).toLocaleString("en-IN")}
                          </div>
                          <div className="text-[10px] text-slate-400 capitalize">
                            {member.salary_type} rate
                          </div>
                        </td>

                        {/* Phone & Email */}
                        <td className="px-4 py-4">
                          <div className="text-slate-500 text-xs flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {member.phone}
                          </div>
                          {member.email && (
                            <div className="text-slate-400 text-xs flex items-center gap-1.5 mt-0.5">
                              <Mail className="w-3 h-3 text-slate-400" />
                              {member.email}
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                              onClick={() => openProfile(member)}
                              title="Edit Employee Properties"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-8 w-8 ${
                                member.is_active
                                  ? "text-red-500 hover:text-red-600 hover:bg-red-50"
                                  : "text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50"
                              }`}
                              onClick={() => handleToggleArchive(member)}
                              title={member.is_active ? "Archive Staff" : "Restore Staff"}
                            >
                              {member.is_active ? (
                                <Archive className="w-3.5 h-3.5" />
                              ) : (
                                <RotateCcw className="w-3.5 h-3.5" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* ═══════════════════════════════════════════════════════
            DIALOGS
            ═══════════════════════════════════════════════════════ */}
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
          staff={
            selectedStaff
              ? {
                  id: selectedStaff.id,
                  name: selectedStaff.name,
                  pending_salary: calculatePendingSalary(selectedStaff),
                  account_name: selectedStaff.account_name,
                  account_number: selectedStaff.account_number,
                  bank_name: selectedStaff.bank_name,
                  ifsc_code: selectedStaff.ifsc_code,
                  upi_id: selectedStaff.upi_id,
                }
              : null
          }
          onPaid={() => {
            setShowPayDialog(false)
            fetchStaff()
          }}
        />

        <AddStaffDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          onStaffAdded={() => {
            setShowAddDialog(false)
            fetchStaff()
          }}
          shopId={shopId}
        />
      </div>
    </MainLayout>
  )
}