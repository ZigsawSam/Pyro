"use client"

import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Loader2, Plus, CheckCircle } from "lucide-react"
import { createShopClient } from "@/lib/supabase/shop-client"
import { MainLayout } from "@/components/layout/main-layout"

interface SalaryRecord {
  id: number
  staff_id: number
  staff_name: string
  month: string
  present_days: number
  base_salary: number
  advances: number
  final_payable: number
  status: string
  paid_at: string | null
}

export default function ShopSalaryPage() {
  const supabase = createShopClient()
  const params = useParams()
  const shopId = Number(params?.shopId)
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    fetchSalary()
  }, [shopId, month])

  const fetchSalary = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("salary")
        .select("*, staff:staff_id(name)")
        .eq("shop_id", shopId)
        .eq("month", month)
        .order("staff_id")

      if (error) throw error

      const formatted = (data || []).map((s: any) => ({
        id: s.id,
        staff_id: s.staff_id,
        staff_name: s.staff?.name || "Unknown",
        month: s.month,
        present_days: s.present_days,
        base_salary: s.base_salary,
        advances: s.advances,
        final_payable: s.final_payable,
        status: s.status,
        paid_at: s.paid_at,
      }))

      setSalaryRecords(formatted)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      // Get all staff
      const { data: staffData } = await supabase
        .from("staff")
        .select("id, base_salary, salary_type")
        .eq("shop_id", shopId)

      if (!staffData || staffData.length === 0) {
        alert("No staff found")
        return
      }

      // Get attendance for the month
      const monthStart = `${month}-01`
      const monthEnd = `${month}-31`

      const { data: attendanceData } = await supabase
        .from("attendance")
        .select("staff_id, status, work_hours")
        .eq("shop_id", shopId)
        .gte("attendance_date", monthStart)
        .lte("attendance_date", monthEnd)

      // Get advances for the month
      const { data: advancesData } = await supabase
        .from("payouts")
        .select("person_id, amount_paid")
        .eq("shop_id", shopId)
        .eq("person_type", "staff")
        .eq("is_advance", true)
        .gte("payment_date", monthStart)
        .lte("payment_date", monthEnd)

      const attendanceByStaff = (attendanceData || []).reduce((acc: any, a: any) => {
        if (!acc[a.staff_id]) acc[a.staff_id] = { present: 0, hours: 0 }
        if (a.status === "present") acc[a.staff_id].present += 1
        if (a.status === "half") acc[a.staff_id].present += 0.5
        acc[a.staff_id].hours += Number(a.work_hours || 0)
        return acc
      }, {})

      const advancesByStaff = (advancesData || []).reduce((acc: any, a: any) => {
        acc[a.person_id] = (acc[a.person_id] || 0) + Number(a.amount_paid || 0)
        return acc
      }, {})

      const salaryRecords = staffData.map((s: any) => {
        const presentDays = attendanceByStaff[s.id]?.present || 0
        const workHours = attendanceByStaff[s.id]?.hours || 0
        const advances = advancesByStaff[s.id] || 0

        let finalPayable = 0
        if (s.salary_type === "monthly") {
          finalPayable = Number(s.base_salary || 0) - advances
        } else if (s.salary_type === "daily") {
          finalPayable = (Number(s.base_salary || 0) * presentDays) - advances
        } else if (s.salary_type === "hourly") {
          finalPayable = (Number(s.base_salary || 0) * workHours) - advances
        }

        return {
          shop_id: shopId,
          staff_id: s.id,
          month,
          present_days: Math.floor(presentDays),
          base_salary: s.base_salary,
          advances,
          final_payable: Math.max(0, finalPayable),
          status: "pending",
        }
      })

      // Upsert salary records
      const { error } = await supabase
        .from("salary")
        .upsert(salaryRecords, { onConflict: "shop_id,staff_id,month" })

      if (error) throw error

      fetchSalary()
    } catch (e) {
      console.error(e)
      alert("Failed to generate salary")
    } finally {
      setGenerating(false)
    }
  }

  const handleMarkPaid = async (salaryId: number) => {
    try {
      const { error } = await supabase
        .from("salary")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", salaryId)
        .eq("shop_id", shopId)

      if (error) throw error
      fetchSalary()
    } catch (e) {
      console.error(e)
      alert("Failed to mark as paid")
    }
  }

  return (
    <MainLayout title="Salary" shopId={shopId}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Salary</h1>
        <div className="flex gap-2">
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-auto" />
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Generate
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2">Staff</th>
                <th className="pb-2">Present Days</th>
                <th className="pb-2 text-right">Base Salary</th>
                <th className="pb-2 text-right">Advances</th>
                <th className="pb-2 text-right">Final Payable</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {salaryRecords.map((record) => (
                <tr key={record.id} className="border-b">
                  <td className="py-2">{record.staff_name}</td>
                  <td className="py-2">{record.present_days}</td>
                  <td className="py-2 text-right">₹{Number(record.base_salary).toLocaleString()}</td>
                  <td className="py-2 text-right text-red-600">₹{Number(record.advances).toLocaleString()}</td>
                  <td className="py-2 text-right font-bold">₹{Number(record.final_payable).toLocaleString()}</td>
                  <td className="py-2">
                    <span className={`text-xs px-2 py-1 rounded ${record.status === "paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="py-2">
                    {record.status === "pending" && (
                      <Button size="sm" onClick={() => handleMarkPaid(record.id)}>
                        <CheckCircle className="h-4 w-4 mr-1" /> Mark Paid
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {salaryRecords.length === 0 && (
                <tr><td colSpan={7} className="text-center text-muted-foreground py-8">No salary records. Click Generate to create.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </MainLayout>
  )
}