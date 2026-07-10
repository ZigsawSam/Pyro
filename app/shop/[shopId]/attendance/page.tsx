"use client"

import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Loader2, Save } from "lucide-react"
import { createShopClient } from "@/lib/supabase/shop-client"
import { MainLayout } from "@/components/layout/main-layout"

interface StaffAttendance {
  staff_id: number
  staff_name: string
  status: "present" | "absent" | "half"
  work_hours: number
}

export default function ShopAttendancePage() {
  const supabase = createShopClient()
  const params = useParams()
  const shopId = Number(params?.shopId)
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [staff, setStaff] = useState<StaffAttendance[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchAttendance()
  }, [shopId, date])

  const fetchAttendance = async () => {
    setLoading(true)
    try {
      const { data: staffData, error: staffError } = await supabase
        .from("staff")
        .select("id, name, salary_type, working_hours_per_day")
        .eq("shop_id", shopId)

      if (staffError) throw staffError

      const { data: attendanceData } = await supabase
        .from("attendance")
        .select("*")
        .eq("shop_id", shopId)
        .eq("attendance_date", date)

      const attendanceMap = (attendanceData || []).reduce((acc: any, a: any) => {
        acc[a.staff_id] = a
        return acc
      }, {})

      const formattedStaff = (staffData || []).map((s: any) => {
        const att = attendanceMap[s.id]
        return {
          staff_id: s.id,
          staff_name: s.name,
          status: att?.status || "present",
          work_hours: att?.work_hours || (s.salary_type === "hourly" ? 8 : 1),
        }
      })

      setStaff(formattedStaff)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
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
        work_hours: s.work_hours,
      }))

      const { error } = await supabase
        .from("attendance")
        .upsert(records, { onConflict: "shop_id,staff_id,attendance_date" })

      if (error) throw error
      alert("Attendance saved!")
    } catch (e) {
      console.error(e)
      alert("Failed to save attendance")
    } finally {
      setSaving(false)
    }
  }

  const updateStaff = (staffId: number, field: string, value: any) => {
    setStaff((prev) => prev.map((s) => s.staff_id === staffId ? { ...s, [field]: value } : s))
  }

  return (
    <MainLayout title="Attendance" shopId={shopId}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Attendance</h1>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {staff.map((s) => (
              <Card key={s.staff_id} className="p-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <p className="font-medium w-32">{s.staff_name}</p>
                  <select
                    value={s.status}
                    onChange={(e) => updateStaff(s.staff_id, "status", e.target.value)}
                    className="rounded border border-input bg-background px-3 py-2"
                  >
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="half">Half Day</option>
                  </select>
                  <Input
                    type="number"
                    step="0.5"
                    placeholder="Hours"
                    value={s.work_hours}
                    onChange={(e) => updateStaff(s.staff_id, "work_hours", Number(e.target.value))}
                    className="w-24"
                  />
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
