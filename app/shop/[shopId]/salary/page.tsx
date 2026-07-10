"use client"

import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Loader2, IndianRupee, Calendar } from "lucide-react"
import { createShopClient } from "@/lib/supabase/shop-client"
import { MainLayout } from "@/components/layout/main-layout"

interface SalaryRecord {
  id?: number
  staff_id: number
  staff_name: string
  salary_type: string
  base_salary: number
  present_days: number
  work_hours: number
  overtime_hours: number
  overtime_pay: number
  advances: number
  final_payable: number
  status: string
}

export default function ShopSalaryPage() {
  const supabase = createShopClient()
  const params = useParams()
  const shopId = Number(params?.shopId)
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  })
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    fetchSalaryData()
  }, [shopId, month])

  const fetchSalaryData = async () => {
    setLoading(true)
    try {
      const [year, monthNum] = month.split("-")
      const monthStart = `${year}-${monthNum}-01`
      const monthEnd = `${year}-${monthNum}-${new Date(Number(year), Number(monthNum), 0).getDate()}`

      // Fetch staff with working hours config
      const { data: staffData, error: staffError } = await supabase
        .from("staff")
        .select("id, name, salary_type, base_salary, working_hours_per_day, overtime_rate")
        .eq("shop_id", shopId)
        .eq("is_active", true)

      if (staffError) throw staffError

      // Fetch attendance for the month
      const { data: attendanceData } = await supabase
        .from("attendance")
        .select("staff_id, status, work_hours, overtime_hours")
        .eq("shop_id", shopId)
        .gte("attendance_date", monthStart)
        .lte("attendance_date", monthEnd)

      // Fetch advances (payouts) for the month
      const { data: advancesData } = await supabase
        .from("payouts")
        .select("staff_id, amount_paid")
        .eq("shop_id", shopId)
        .eq("person_type", "staff")
        .gte("payment_date", monthStart)
        .lte("payment_date", monthEnd)

      // Fetch existing salary records
      const { data: existingSalary } = await supabase
        .from("salary")
        .select("*")
        .eq("shop_id", shopId)
        .eq("month", month)

      const existingMap = (existingSalary || []).reduce((acc: any, s: any) => {
        acc[s.staff_id] = s
        return acc
      }, {})

      // Calculate attendance per staff
      const attendanceByStaff = (attendanceData || []).reduce((acc: any, a: any) => {
        if (!acc[a.staff_id]) {
          acc[a.staff_id] = { present: 0, half: 0, hours: 0, overtime_hours: 0 }
        }
        if (a.status === "present") acc[a.staff_id].present += 1
        if (a.status === "half") acc[a.staff_id].half += 1
        acc[a.staff_id].hours += Number(a.work_hours || 0)
        acc[a.staff_id].overtime_hours += Number(a.overtime_hours || 0)
        return acc
      }, {})

      // Calculate advances per staff
      const advancesByStaff = (advancesData || []).reduce((acc: any, a: any) => {
        acc[a.staff_id] = (acc[a.staff_id] || 0) + Number(a.amount_paid || 0)
        return acc
      }, {})

      // Build salary records
      const records = (staffData || []).map((s: any) => {
        const att = attendanceByStaff[s.id] || { present: 0, half: 0, hours: 0, overtime_hours: 0 }
        const presentDays = att.present + (att.half * 0.5)
        const workHours = att.hours
        const overtimeHours = att.overtime_hours
        const advances = advancesByStaff[s.id] || 0
        const workingHoursPerDay = Number(s.working_hours_per_day) || 8
        const overtimeRate = Number(s.overtime_rate) || 0

        let finalPayable = 0
        let overtimePay = 0

        if (s.salary_type === "monthly") {
          const dailyWage = Number(s.base_salary || 0) / 30
          finalPayable = (dailyWage * presentDays) - advances
          overtimePay = overtimeHours * overtimeRate
          finalPayable += overtimePay
        } else if (s.salary_type === "daily") {
          finalPayable = (Number(s.base_salary || 0) * presentDays) - advances
          overtimePay = overtimeHours * overtimeRate
          finalPayable += overtimePay
        } else if (s.salary_type === "hourly") {
          finalPayable = (Number(s.base_salary || 0) * workHours) - advances
          overtimePay = overtimeHours * overtimeRate
          finalPayable += overtimePay
        }

        const existing = existingMap[s.id]

        return {
          id: existing?.id,
          staff_id: s.id,
          staff_name: s.name,
          salary_type: s.salary_type,
          base_salary: Number(s.base_salary || 0),
          present_days: presentDays,
          work_hours: workHours,
          overtime_hours: overtimeHours,
          overtime_pay: overtimePay,
          advances,
          final_payable: Math.max(0, Math.round(finalPayable)),
          status: existing?.status || "pending",
        }
      })

      setSalaryRecords(records)

      // Auto-save salary records to database
      if (records.length > 0) {
        const upsertData = records.map((r) => ({
          shop_id: shopId,
          staff_id: r.staff_id,
          month,
          present_days: r.present_days,
          base_salary: r.base_salary,
          advances: r.advances,
          final_payable: r.final_payable,
          status: r.status,
        }))

        await supabase.from("salary").upsert(upsertData, {
          onConflict: "shop_id,staff_id,month",
        })
      }
    } catch (e) {
      console.error("Salary fetch error:", e)
    } finally {
      setLoading(false)
    }
  }

  const handlePay = async (record: SalaryRecord) => {
    try {
      const { error } = await supabase
        .from("salary")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", record.id)

      if (error) throw error

      // Also create a payout record
      await supabase.from("payouts").insert({
        shop_id: shopId,
        staff_id: record.staff_id,
        person_type: "staff",
        amount_paid: record.final_payable,
        payment_date: new Date().toISOString().split("T")[0],
        notes: `Salary for ${month}`,
      })

      await fetchSalaryData()
      alert("Salary marked as paid!")
    } catch (e) {
      console.error(e)
      alert("Failed to process payment")
    }
  }

  const totalPending = salaryRecords
    .filter((r) => r.status === "pending")
    .reduce((sum, r) => sum + r.final_payable, 0)

  return (
    <MainLayout title="Salary" shopId={shopId}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Salary</h1>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total Pending</p>
            <p className="text-xl font-bold text-red-600">₹{totalPending.toLocaleString()}</p>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-auto"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : salaryRecords.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No staff found or no attendance recorded for this month.</p>
          <p className="text-sm text-muted-foreground mt-1">Record attendance first to generate salary.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {salaryRecords.map((record) => (
            <Card key={record.staff_id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{record.staff_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {record.salary_type} • ₹{record.base_salary.toLocaleString()} • {record.present_days} days
                  </p>
                  {record.overtime_hours > 0 && (
                    <p className="text-xs text-orange-600">
                      Overtime: {record.overtime_hours} hrs = ₹{record.overtime_pay.toLocaleString()}
                    </p>
                  )}
                  {record.advances > 0 && (
                    <p className="text-xs text-red-600">
                      Advances deducted: ₹{record.advances.toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="text-right flex items-center gap-3">
                  <div>
                    <p className="text-lg font-bold">₹{record.final_payable.toLocaleString()}</p>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        record.status === "paid"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {record.status}
                    </span>
                  </div>
                  {record.status === "pending" && record.final_payable > 0 && (
                    <Button size="sm" onClick={() => handlePay(record)}>
                      <IndianRupee className="mr-1 h-3 w-3" />
                      Pay
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </MainLayout>
  )
}