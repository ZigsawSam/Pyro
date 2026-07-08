"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"

interface AttendanceRecord {
  staff_id: number
  staff_name: string
  role: string
  status: "present" | "absent" | "half"
  work_hours: number
}

interface AttendanceLog {
  id: number
  staff_name: string
  role: string
  attendance_date: string
  log_type: string
  logged_at: string
  status: string
}

export default function AttendancePage() {
  const params = useParams()
  const shopId = Number(params.shopId as string)
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [logs, setLogs] = useState<AttendanceLog[]>([])
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [isLoading, setIsLoading] = useState(true)
  const [isMounted, setIsMounted] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<Record<number, "present" | "absent" | "half">>({})
  const [selectedLogType, setSelectedLogType] = useState<Record<number, string>>({})

  useEffect(() => { setIsMounted(true) }, [])

  const fetchAttendance = async () => {
    try {
      const response = await fetch(`/api/shops/${shopId}/attendance?date=${date}`)
      if (!response.ok) throw new Error("Failed to fetch attendance")
      const data = await response.json()
      setAttendance(data.attendance || [])
      setLogs(data.logs || [])
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!isMounted) return
    fetchAttendance()
  }, [shopId, date, isMounted])

  const canLogAttendance = () => {
    const now = new Date()
    const hour = now.getHours()
    return hour >= 9 && hour < 12
  }

  const handleSaveAttendance = async (staffId: number, status: "present" | "absent" | "half") => {
    try {
      const response = await fetch(`/api/shops/${shopId}/attendance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          staff_id: staffId,
          date,
          status,
          work_hours: status === "present" ? 8 : status === "half" ? 4 : 0,
          log_type: selectedLogType[staffId] || "Entry",
          logged_at: format(new Date(), "HH:mm"),
          notes: `${selectedLogType[staffId] || "Entry"} recorded`,
        }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: "Unknown error" }))
        console.error("API Error:", errData)
        throw new Error(errData.details || errData.error || "Failed to save attendance")
      }

      fetchAttendance()
    } catch (error) {
      console.error("Error:", error)
    }
  }

  if (!isMounted) {
    return (
      <MainLayout title="Attendance" shopId={shopId}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout title="Attendance" subtitle="Mark daily attendance" shopId={shopId}>
      <div className="mb-6">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-3 py-2 border border-border rounded bg-card"
        />
      </div>

      <Card className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="space-y-3">
            {attendance.map((record) => {
              const selected = selectedStatus[record.staff_id] || record.status
              const isAbsent = selected === "absent"
              const presentWindow = canLogAttendance()
              
              return (
                <div key={record.staff_id} className="rounded-lg border border-border p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold">{record.staff_name}</p>
                      <p className="text-sm text-muted-foreground">{record.role}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {(["present", "absent", "half"] as const).map((s) => (
                        <Button
                          key={s}
                          size="sm"
                          variant={selected === s ? "default" : "outline"}
                          disabled={s === "present" && !presentWindow}
                          onClick={() => setSelectedStatus((prev) => ({ ...prev, [record.staff_id]: s }))}
                        >
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </Button>
                      ))}
                      <select
                        value={selectedLogType[record.staff_id] || "Entry"}
                        onChange={(e) => setSelectedLogType((prev) => ({ ...prev, [record.staff_id]: e.target.value }))}
                        disabled={isAbsent}
                        className={`rounded border border-border bg-card px-3 py-2 ${isAbsent ? "opacity-50 cursor-not-allowed bg-muted" : ""}`}
                      >
                        <option value="Entry">Entry</option>
                        <option value="Lunch">Lunch</option>
                        <option value="Exit">Exit</option>
                      </select>
                      <Button
                        size="sm"
                        className={selected === "present" ? "bg-green-600 hover:bg-green-700" : ""}
                        onClick={() => handleSaveAttendance(record.staff_id, selected)}
                      >
                        Add to Log
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Card className="mt-6 p-6">
        <h3 className="mb-4 text-lg font-semibold">Attendance Log</h3>
        <div className="space-y-2">
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attendance logs yet for this date.</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex flex-wrap items-center justify-between rounded border border-border px-3 py-2 text-sm">
                <span className="font-medium">{log.staff_name}</span>
                <span className="text-muted-foreground">{log.role}</span>
                <span>{log.attendance_date}</span>
                <span>{log.logged_at}</span>
                <span>{log.log_type}</span>
                <span className="capitalize">{log.status}</span>
              </div>
            ))
          )}
        </div>
      </Card>
    </MainLayout>
  )
}