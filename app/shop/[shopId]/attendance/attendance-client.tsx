"use client"

import { useEffect, useState, useCallback } from "react"
import {
  CalendarDays,
  CheckCircle,
  Lock,
  Unlock,
  Gift,
  UserCheck,
  Clock,
  Save,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { createShopClient } from "@/lib/supabase/shop-client"
import { MainLayout } from "@/components/layout/main-layout"

type AttendanceStatus = "present" | "absent" | "half" | "leave" | "holiday"

interface StaffMember {
  id: number
  name: string
  role: string
  salary_type: string
  employee_id?: string
}

interface TempRecord {
  status: AttendanceStatus
  hours?: number
  overtime_hours?: number
  remarks?: string
}

interface AttendanceLog {
  id: number
  staff_name: string
  attendance_date: string
  status: string
}

interface ShopAttendancePageProps {
  shopId: string
  user?: any
}

export function ShopAttendancePage({ shopId: shopIdProp }: ShopAttendancePageProps) {
  const supabase = createShopClient()
  const shopId = parseInt(shopIdProp, 10)

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0])
  const [staffList, setStaffList] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lockedStaff, setLockedStaff] = useState<Record<number, boolean>>({})
  const [tempRecords, setTempRecords] = useState<Record<number, TempRecord>>({})
  const [message, setMessage] = useState("")
  const [showHolidayInput, setShowHolidayInput] = useState(false)
  const [holidayName, setHolidayName] = useState("")
  const [showLogs, setShowLogs] = useState(false)
  const [logs, setLogs] = useState<AttendanceLog[]>([])
  const [logLoading, setLogLoading] = useState(false)

  /* ── Data Fetching ── */
  const fetchData = useCallback(async () => {
    if (isNaN(shopId)) return
    setLoading(true)
    try {
      const { data: staffData, error: staffError } = await supabase
        .from("staff")
        .select("id, name, role, salary_type, employee_id")
        .eq("shop_id", shopId)
        .eq("is_active", true)

      if (staffError) throw staffError
      setStaffList(staffData || [])

      const { data: attendanceData } = await supabase
        .from("attendance")
        .select("staff_id, status, work_hours, overtime_hours, remarks")
        .eq("shop_id", shopId)
        .eq("attendance_date", selectedDate)

      const initialRecords: Record<number, TempRecord> = {}
      const initialLocks: Record<number, boolean> = {}

      staffData?.forEach((st: any) => {
        const match = attendanceData?.find((a: any) => a.staff_id === st.id)
        initialRecords[st.id] = {
          status: match ? (match.status as AttendanceStatus) : "present",
          hours: match?.work_hours || (st.salary_type === "hourly" ? 8 : undefined),
          overtime_hours: match?.overtime_hours || 0,
          remarks: match?.remarks || "",
        }
        initialLocks[st.id] = !!match
      })

      setTempRecords(initialRecords)
      setLockedStaff(initialLocks)
      setMessage("")
    } catch (e: any) {
      console.error("Fetch error:", e)
      toast.error(e?.message || "Failed to load attendance data")
    } finally {
      setLoading(false)
    }
  }, [shopId, selectedDate, supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(""), 3000)
    return () => clearTimeout(timer)
  }, [message])

  /* ── Logs ── */
  const fetchLogs = async () => {
    setLogLoading(true)
    try {
      const { data } = await supabase
        .from("attendance")
        .select("id, staff_id, attendance_date, status, remarks")
        .eq("shop_id", shopId)
        .order("attendance_date", { ascending: false })
        .limit(100)

      const staffMap = staffList.reduce((acc: Record<number, string>, s) => {
        acc[s.id] = s.name
        return acc
      }, {})

      const formattedLogs = (data || []).map((a: any) => ({
        id: a.id,
        staff_name: staffMap[a.staff_id] || "Unknown",
        attendance_date: a.attendance_date,
        status: a.status,
      }))

      setLogs(formattedLogs)
    } catch (e: any) {
      console.error(e)
    } finally {
      setLogLoading(false)
    }
  }

  const toggleLogs = () => {
    if (!showLogs) fetchLogs()
    setShowLogs(!showLogs)
  }

  /* ── Actions ── */
  const handleStatusClick = (staffId: number, status: AttendanceStatus) => {
    if (lockedStaff[staffId]) return
    const staffMember = staffList.find((s) => s.id === staffId)
    setTempRecords((prev) => ({
      ...prev,
      [staffId]: {
        ...prev[staffId],
        status,
        hours:
          status === "present" || status === "holiday"
            ? staffMember?.salary_type === "hourly"
              ? 8
              : undefined
            : status === "half"
              ? staffMember?.salary_type === "hourly"
                ? 4
                : undefined
              : undefined,
      },
    }))
  }

  const handleHoursChange = (staffId: number, hours: number) => {
    if (lockedStaff[staffId]) return
    setTempRecords((prev) => ({
      ...prev,
      [staffId]: { ...prev[staffId], hours },
    }))
  }

  const handleOvertimeChange = (staffId: number, overtime: number) => {
    if (lockedStaff[staffId]) return
    setTempRecords((prev) => ({
      ...prev,
      [staffId]: { ...prev[staffId], overtime_hours: overtime },
    }))
  }

  const handleRemarksChange = (staffId: number, remarks: string) => {
    if (lockedStaff[staffId]) return
    setTempRecords((prev) => ({
      ...prev,
      [staffId]: { ...prev[staffId], remarks },
    }))
  }

  const toggleRowLock = (staffId: number) => {
    setLockedStaff((prev) => ({ ...prev, [staffId]: !prev[staffId] }))
  }

  const handleBulkMarkPresent = () => {
    setTempRecords((prev) => {
      const updated = { ...prev }
      staffList.forEach((st) => {
        if (!lockedStaff[st.id]) {
          updated[st.id] = {
            ...updated[st.id],
            status: "present",
            hours: st.salary_type === "hourly" ? 8 : undefined,
          }
        }
      })
      return updated
    })
  }

  const handleDeclareHoliday = () => {
    if (!holidayName.trim()) {
      toast.error("Please enter a holiday name")
      return
    }

    setTempRecords((prev) => {
      const updated = { ...prev }
      staffList.forEach((st) => {
        updated[st.id] = {
          status: "holiday",
          hours: st.salary_type === "hourly" ? 8 : undefined,
          remarks: holidayName,
        }
      })
      return updated
    })

    setLockedStaff((prev) => {
      const updated = { ...prev }
      staffList.forEach((st) => {
        updated[st.id] = false
      })
      return updated
    })

    setShowHolidayInput(false)
    setMessage(`Drafted Holiday: "${holidayName}" for all employees. Click 'Save Daily Sheets' to commit.`)
    setHolidayName("")
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await supabase
        .from("attendance")
        .delete()
        .eq("shop_id", shopId)
        .eq("attendance_date", selectedDate)

      const records = staffList.map((st) => {
        const temp = tempRecords[st.id]
        const status = temp?.status || "present"
        let work_hours = 0
        if (status === "present" || status === "holiday") {
          work_hours = temp?.hours || (st.salary_type === "hourly" ? 8 : 8)
        } else if (status === "half") {
          work_hours = temp?.hours || (st.salary_type === "hourly" ? 4 : 4)
        }

        return {
          shop_id: shopId,
          staff_id: st.id,
          attendance_date: selectedDate,
          status,
          work_hours,
          overtime_hours: temp?.overtime_hours || 0,
          remarks: temp?.remarks || "",
        }
      })

      const { error } = await supabase.from("attendance").insert(records)

      if (error) throw error

      const savedLocks: Record<number, boolean> = {}
      staffList.forEach((st) => {
        savedLocks[st.id] = true
      })
      setLockedStaff(savedLocks)

      setMessage("Daily attendance sheet updated and locked successfully!")
      toast.success("Attendance saved!")

      if (showLogs) await fetchLogs()
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message || "Failed to save attendance")
    } finally {
      setSaving(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "present":
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Present</Badge>
      case "absent":
        return <Badge className="bg-red-100 text-red-700 border-red-200">Absent</Badge>
      case "half":
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Half Day</Badge>
      case "leave":
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Leave</Badge>
      case "holiday":
        return <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200">Holiday</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  /* ── Render ── */
  if (loading) {
    return (
      <MainLayout title="Attendance" subtitle="Track daily staff attendance" shopId={shopId}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout title="Attendance" subtitle="Track daily staff attendance" shopId={shopId}>
      <div className="space-y-6">

        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-400/30">
              <CalendarDays className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Workforce Attendance Registry</h1>
              <p className="text-sm text-slate-400">Record daily presents, leaves, and billable service hours.</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white/10 border border-white/10 p-2 rounded-xl">
            <span className="text-xs text-slate-300 font-medium">Select Date:</span>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white text-xs w-auto"
            />
          </div>
        </div>

        {/* Message Banner */}
        {message && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-in fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* Daily Attendance Sheet */}
        <Card className="bg-white border border-slate-200 overflow-hidden rounded-2xl shadow-sm">
          <CardContent className="p-6 space-y-6">
            {/* Sheet Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Daily Attendance Sheet
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHolidayInput(!showHolidayInput)}
                  className="gap-1.5 border-slate-200 text-indigo-600 hover:bg-indigo-50"
                >
                  <Gift className="w-3.5 h-3.5" />
                  Declare Shop Holiday
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkMarkPresent}
                  className="gap-1.5 border-slate-200 text-blue-600 hover:bg-blue-50"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  Mark All Active Present
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleLogs}
                  className="gap-1.5 border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  {showLogs ? "Hide Logs" : "View Logs"}
                </Button>
              </div>
            </div>

            {/* Holiday Input */}
            {showHolidayInput && (
              <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl flex flex-col sm:flex-row items-end gap-3">
                <div className="flex-1 w-full">
                  <label className="block text-[10px] uppercase font-mono font-bold text-indigo-600 tracking-wider">
                    Holiday Name / Festival Name
                  </label>
                  <Input
                    placeholder="e.g. Independence Day, Diwali Festival..."
                    value={holidayName}
                    onChange={(e) => setHolidayName(e.target.value)}
                    className="mt-1.5 bg-white border-indigo-200"
                  />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    size="sm"
                    onClick={handleDeclareHoliday}
                    className="bg-indigo-500 hover:bg-indigo-600 text-white"
                  >
                    Apply Holiday
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setShowHolidayInput(false); setHolidayName("") }}
                    className="border-slate-200 text-slate-600"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Logs Panel */}
            {showLogs && (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-900">Attendance History</h3>
                </div>
                {logLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                  </div>
                ) : logs.length === 0 ? (
                  <p className="text-center text-slate-400 py-8 text-sm">No attendance records found.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                          <th className="text-left px-4 py-3 font-medium text-slate-500 uppercase text-xs tracking-wider">Date</th>
                          <th className="text-left px-4 py-3 font-medium text-slate-500 uppercase text-xs tracking-wider">Staff</th>
                          <th className="text-left px-4 py-3 font-medium text-slate-500 uppercase text-xs tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((log) => (
                          <tr key={log.id} className="border-b border-slate-50 last:border-0">
                            <td className="px-4 py-3 text-slate-600">{log.attendance_date}</td>
                            <td className="px-4 py-3 font-medium text-slate-900">{log.staff_name}</td>
                            <td className="px-4 py-3">{getStatusBadge(log.status)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Attendance Entries */}
            <div className="space-y-3">
              {staffList.map((st) => {
                const temp = tempRecords[st.id] || { status: "present", remarks: "" }
                const rowLocked = lockedStaff[st.id]

                return (
                  <div
                    key={st.id}
                    className={`border rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                      rowLocked
                        ? "bg-amber-50/50 border-amber-200"
                        : "bg-slate-50/50 border-slate-200"
                    }`}
                  >
                    {/* Employee Info */}
                    <div className="md:w-1/5 flex items-start gap-2.5">
                      <button
                        type="button"
                        onClick={() => toggleRowLock(st.id)}
                        title={rowLocked ? "Unlock to edit" : "Lock to prevent edits"}
                        className={`mt-0.5 p-1.5 rounded-lg transition-all shrink-0 ${
                          rowLocked
                            ? "bg-amber-100 text-amber-600 border border-amber-200 hover:bg-amber-200"
                            : "bg-slate-100 text-slate-400 border border-slate-200 hover:text-slate-600"
                        }`}
                      >
                        {rowLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                      </button>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono text-slate-500 font-bold">
                            {st.employee_id || `EMP${String(st.id).padStart(3, "0")}`}
                          </span>
                          {rowLocked && (
                            <Badge variant="outline" className="text-[8px] border-amber-300 text-amber-600 bg-amber-50">
                              LOCKED
                            </Badge>
                          )}
                        </div>
                        <h3 className="text-sm font-semibold text-slate-900 mt-0.5">{st.name}</h3>
                        <p className="text-[10px] text-slate-400 capitalize">{st.role}</p>
                      </div>
                    </div>

                    {/* Status Toggles */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {(["present", "absent", "half", "leave", "holiday"] as AttendanceStatus[]).map((status) => {
                        const active = temp.status === status
                        const statusStyles = {
                          present: "bg-emerald-100 border-emerald-300 text-emerald-700",
                          absent: "bg-red-100 border-red-300 text-red-700",
                          half: "bg-amber-100 border-amber-300 text-amber-700",
                          leave: "bg-blue-100 border-blue-300 text-blue-700",
                          holiday: "bg-indigo-100 border-indigo-300 text-indigo-700",
                        }
                        return (
                          <button
                            key={status}
                            type="button"
                            disabled={rowLocked}
                            onClick={() => handleStatusClick(st.id, status)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border transition-all ${
                              rowLocked ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                            } ${
                              active
                                ? statusStyles[status]
                                : "bg-white border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            {status === "half" ? "Half Day" : status}
                          </button>
                        )
                      })}
                    </div>

                    {/* Hours & Overtime */}
                    <div className="flex items-center gap-2">
                      {st.salary_type === "hourly" &&
                      (temp.status === "present" || temp.status === "half" || temp.status === "holiday") ? (
                        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1 px-2.5">
                          <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span className="text-[10px] text-slate-400">Hrs:</span>
                          <Input
                            type="number"
                            min={0.5}
                            max={24}
                            step="0.5"
                            disabled={rowLocked}
                            value={temp.hours || 8}
                            onChange={(e) => handleHoursChange(st.id, Number(e.target.value))}
                            className="bg-transparent border-none outline-none w-10 text-center text-xs font-mono font-bold text-slate-900 p-0 h-6"
                          />
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-mono italic">
                          {st.salary_type === "monthly" ? "Monthly Flat" : "Daily Wage"}
                        </span>
                      )}

                      {/* Overtime hours */}
                      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1 px-2.5">
                        <span className="text-[10px] text-slate-400">OT:</span>
                        <Input
                          type="number"
                          min={0}
                          max={12}
                          step="0.5"
                          disabled={rowLocked}
                          value={temp.overtime_hours || 0}
                          onChange={(e) => handleOvertimeChange(st.id, Number(e.target.value))}
                          className="bg-transparent border-none outline-none w-8 text-center text-xs font-mono font-bold text-slate-900 p-0 h-6"
                        />
                      </div>
                    </div>

                    {/* Remarks */}
                    <div className="flex-1 md:max-w-xs w-full">
                      <Input
                        disabled={rowLocked}
                        placeholder="Holiday reason / leave reason / note..."
                        value={temp.remarks || ""}
                        onChange={(e) => handleRemarksChange(st.id, e.target.value)}
                        className="bg-white border-slate-200 text-xs h-8"
                      />
                    </div>
                  </div>
                )
              })}

              {staffList.length === 0 && (
                <div className="py-12 text-center text-slate-400 text-sm">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  No active employees registered. Onboard staff first!
                </div>
              )}
            </div>

            {/* Save Footer */}
            {staffList.length > 0 && (
              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <span className="text-[10px] text-amber-600 font-mono flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  Saved records lock automatically to protect audit trails.
                </span>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="gap-2 bg-blue-500 hover:bg-blue-600 text-white"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Daily Sheets
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}