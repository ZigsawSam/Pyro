"use client"

import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Loader2, Save, CalendarDays } from "lucide-react"
import { createShopClient } from "@/lib/supabase/shop-client"
import { MainLayout } from "@/components/layout/main-layout"

interface StaffAttendance {
  staff_id: number
  staff_name: string
  status: "present" | "absent" | "half"
  logged: boolean
  existingStatus?: string
}

interface AttendanceLog {
  id: number
  staff_name: string
  attendance_date: string
  status: string
}

export default function ShopAttendancePage() {
  const supabase = createShopClient()
  const params = useParams()
  const shopId = Number(params?.shopId)
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [staff, setStaff] = useState<StaffAttendance[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [logs, setLogs] = useState<AttendanceLog[]>([])
  const [showLogs, setShowLogs] = useState(false)
  const [logLoading, setLogLoading] = useState(false)

  useEffect(() => {
    fetchAttendance()
  }, [shopId, date])

  const fetchAttendance = async () => {
    setLoading(true)
    try {
      const { data: staffData, error: staffError } = await supabase
        .from("staff")
        .select("id, name")
        .eq("shop_id", shopId)

      if (staffError) throw staffError

      const { data: attendanceData } = await supabase
        .from("attendance")
        .select("staff_id, status")
        .eq("shop_id", shopId)
        .eq("attendance_date", date)

      const attendanceMap = (attendanceData || []).reduce((acc: any, a: any) => {
        acc[a.staff_id] = a.status
        return acc
      }, {})

      const formattedStaff = (staffData || []).map((s: any) => ({
        staff_id: s.id,
        staff_name: s.name,
        status: attendanceMap[s.id] || "present",
        logged: !!attendanceMap[s.id],
        existingStatus: attendanceMap[s.id],
      }))

      setStaff(formattedStaff)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const fetchLogs = async () => {
    setLogLoading(true)
    try {
      const { data } = await supabase
        .from("attendance")
        .select("id, staff_id, attendance_date, status, staff:staff_id(name)")
        .eq("shop_id", shopId)
        .order("attendance_date", { ascending: false })
        .limit(100)

      const formattedLogs = (data || []).map((a: any) => ({
        id: a.id,
        staff_name: a.staff?.name || "Unknown",
        attendance_date: a.attendance_date,
        status: a.status,
      }))

      setLogs(formattedLogs)
    } catch (e) {
      console.error(e)
    } finally {
      setLogLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const records = staff.map((s) => ({
        shop_id: shopId,
        staff_id: s.staff_id,
        attendance_date: date,
        status: s.status,
        work_hours: s.status === "present" ? 8 : s.status === "half" ? 4 : 0,
      }))

      const { error } = await supabase
        .from("attendance")
        .upsert(records, { onConflict: "shop_id,staff_id,attendance_date" })

      if (error) throw error

      // Refresh both attendance and logs without page reload
      await fetchAttendance()
      if (showLogs) await fetchLogs()

      alert("Attendance saved!")
    } catch (e) {
      console.error(e)
      alert("Failed to save attendance")
    } finally {
      setSaving(false)
    }
  }

  const updateStatus = (staffId: number, status: string) => {
    setStaff((prev) => prev.map((s) => s.staff_id === staffId ? { ...s, status: status as any } : s))
  }

  const toggleLogs = () => {
    if (!showLogs) fetchLogs()
    setShowLogs(!showLogs)
  }

  return (
    <MainLayout title="Attendance" shopId={shopId}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Attendance</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={toggleLogs}>
            <CalendarDays className="mr-2 h-4 w-4" />
            {showLogs ? "Hide Logs" : "View Logs"}
          </Button>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />
        </div>
      </div>

      {showLogs && (
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-3">Attendance History</h2>
          {logLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : logs.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No attendance records found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">Date</th>
                    <th className="text-left py-2 px-2">Staff</th>
                    <th className="text-left py-2 px-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-100">
                      <td className="py-2 px-2">{log.attendance_date}</td>
                      <td className="py-2 px-2">{log.staff_name}</td>
                      <td className="py-2 px-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          log.status === "present" ? "bg-green-100 text-green-800" :
                          log.status === "absent" ? "bg-red-100 text-red-800" :
                          "bg-yellow-100 text-yellow-800"
                        }`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {staff.map((s) => (
              <Card key={s.staff_id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <p className="font-medium w-40">{s.staff_name}</p>
                    {s.logged && (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        s.existingStatus === "present" ? "bg-green-100 text-green-800" :
                        s.existingStatus === "absent" ? "bg-red-100 text-red-800" :
                        "bg-yellow-100 text-yellow-800"
                      }`}>
                        Logged: {s.existingStatus}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={s.status === "present" ? "default" : "outline"}
                      onClick={() => updateStatus(s.staff_id, "present")}
                      disabled={s.logged && s.existingStatus !== "present"}
                      className={s.logged && s.existingStatus !== "present" ? "opacity-50 cursor-not-allowed" : ""}
                    >
                      Present
                    </Button>
                    <Button
                      size="sm"
                      variant={s.status === "half" ? "default" : "outline"}
                      onClick={() => updateStatus(s.staff_id, "half")}
                      disabled={s.logged && s.existingStatus !== "half"}
                      className={s.logged && s.existingStatus !== "half" ? "opacity-50 cursor-not-allowed" : ""}
                    >
                      Half Day
                    </Button>
                    <Button
                      size="sm"
                      variant={s.status === "absent" ? "default" : "outline"}
                      onClick={() => updateStatus(s.staff_id, "absent")}
                      disabled={s.logged && s.existingStatus !== "absent"}
                      className={s.logged && s.existingStatus !== "absent" ? "opacity-50 cursor-not-allowed" : ""}
                    >
                      Absent
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
            {staff.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No staff found. Add staff first.</p>
            )}
          </div>

          {staff.length > 0 && (
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Attendance
            </Button>
          )}
        </>
      )}
    </MainLayout>
  )
}
