import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  try {
    const { shopId } = await params
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get("date")
    const supabase = await createClient()
    const shopIdNum = Number(shopId)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Get staff with attendance for date
    const { data: staffData, error: staffError } = await supabase
      .from("staff")
      .select("id, name, role")
      .eq("shop_id", shopIdNum)
      .eq("is_active", true)
      .order("name")

    if (staffError) {
      const message = staffError.message
      console.error("GET Error:", message)
      return NextResponse.json({ error: "Internal server error", details: message }, { status: 500 })
    }

    // Get attendance for date
    const { data: attendanceData, error: attendanceError } = await supabase
      .from("attendance")
      .select("staff_id, status, work_hours")
      .eq("shop_id", shopIdNum)
      .eq("attendance_date", date)

    if (attendanceError) {
      const message = attendanceError.message
      console.error("GET Error:", message)
      return NextResponse.json({ error: "Internal server error", details: message }, { status: 500 })
    }

    const attendanceMap = new Map(attendanceData?.map((a: any) => [a.staff_id, a]) || [])

    const records = staffData?.map((staff: any) => {
      const att = attendanceMap.get(staff.id)
      return {
        staff_id: staff.id,
        staff_name: staff.name,
        role: staff.role,
        status: att?.status || "absent",
        work_hours: att?.work_hours || 0,
      }
    }) || []

    // Get logs for date
    const { data: logs, error: logsError } = await supabase
      .from("attendance_logs")
      .select(`
        id,
        staff_id,
        attendance_date,
        log_type,
        logged_at,
        status,
        notes,
        staff:staff_id (
          name,
          role
        )
      `)
      .eq("shop_id", shopIdNum)
      .eq("attendance_date", date)
      .order("logged_at", { ascending: true })

    if (logsError) {
      const message = logsError.message
      console.error("GET Error:", message)
      return NextResponse.json({ error: "Internal server error", details: message }, { status: 500 })
    }

    const formattedLogs = logs?.map((log: any) => ({
      ...log,
      staff_name: log.staff?.name,
      role: log.staff?.role,
    })) || []

    return NextResponse.json({ attendance: records, logs: formattedLogs })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("GET Error:", message)
    return NextResponse.json({ error: "Internal server error", details: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  try {
    const { shopId } = await params
    const { staff_id, date, status, work_hours, log_type, logged_at, notes } = await request.json()
    const supabase = await createClient()
    const shopIdNum = Number(shopId)
    const actualWorkHours = work_hours ?? (status === "present" ? 8 : status === "half" ? 4 : 0)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Upsert attendance
    const { error: upsertError } = await supabase
      .from("attendance")
      .upsert({
        staff_id: staff_id,
        shop_id: shopIdNum,
        attendance_date: date,
        status: status,
        work_hours: actualWorkHours,
      }, {
        onConflict: "staff_id,attendance_date",
      })

    if (upsertError) {
      const message = upsertError.message
      console.error("POST Error:", message)
      return NextResponse.json({ error: "Internal server error", details: message }, { status: 500 })
    }

    // Insert log
    if (log_type && logged_at) {
      const { error: logError } = await supabase
        .from("attendance_logs")
        .insert({
          shop_id: shopIdNum,
          staff_id: staff_id,
          attendance_date: date,
          log_type: log_type,
          logged_at: logged_at,
          status: status,
          notes: notes || null,
        })

      if (logError) {
        const message = logError.message
        console.error("POST Error:", message)
        return NextResponse.json({ error: "Internal server error", details: message }, { status: 500 })
      }
    }

    // Get staff details
    const { data: staffResult, error: staffError } = await supabase
      .from("staff")
      .select("*")
      .eq("id", staff_id)
      .eq("shop_id", shopIdNum)
      .single()

    if (staffError || !staffResult) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 })
    }

    const staff = staffResult

    // Calculate salary based on attendance
    const monthStr = date?.slice(0, 7) + "-01"

    // Count attendance for this month
    const { data: monthAttendance, error: monthError } = await supabase
      .from("attendance")
      .select("status, work_hours")
      .eq("staff_id", staff_id)
      .eq("shop_id", shopIdNum)
      .gte("attendance_date", monthStr)
      .lte("attendance_date", date)

    if (monthError) {
      const message = monthError.message
      console.error("POST Error:", message)
      return NextResponse.json({ error: "Internal server error", details: message }, { status: 500 })
    }

    let presentDays = 0
    let absentDays = 0
    let totalOvertime = 0

    monthAttendance?.forEach((record: any) => {
      if (record.status === "present") presentDays += 1
      else if (record.status === "half") presentDays += 0.5
      else if (record.status === "absent") absentDays += 1

      // Assuming work_hours > 8 is overtime
      if (record.work_hours > 8) {
        totalOvertime += record.work_hours - 8
      }
    })

    // Calculate amounts
    const dailyRate = Number(staff.base_salary) / 30
    const earned = presentDays * dailyRate
    const overtimeAmount = totalOvertime * (dailyRate / 8) * 1.5

    // Get total advances for this month
    const { data: advanceResult, error: advanceError } = await supabase
      .from("payouts")
      .select("amount_paid")
      .eq("staff_id", staff_id)
      .eq("shop_id", shopIdNum)
      .eq("is_advance", true)
      .gte("payment_date", monthStr)
      .lte("payment_date", date)

    if (advanceError) {
      const message = advanceError.message
      console.error("POST Error:", message)
      return NextResponse.json({ error: "Internal server error", details: message }, { status: 500 })
    }

    const totalAdvance = advanceResult?.reduce((sum: number, p: any) => sum + (p.amount_paid || 0), 0) || 0

    const finalPayable = Math.max(earned + overtimeAmount - totalAdvance, 0)

    // Upsert salary record
    const { error: salaryError } = await supabase
      .from("salary")
      .upsert({
        staff_id: staff_id,
        shop_id: shopIdNum,
        month: monthStr,
        total_days: 30,
        present_days: presentDays,
        absent_days: absentDays,
        base_salary: staff.base_salary,
        earned_amount: earned,
        overtime_amount: overtimeAmount,
        deductions: totalAdvance,
        final_payable: finalPayable,
        status: finalPayable <= 0 ? "paid" : "pending",
      }, {
        onConflict: "staff_id,month",
      })

    if (salaryError) {
      const message = salaryError.message
      console.error("POST Error:", message)
      return NextResponse.json({ error: "Internal server error", details: message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("POST Error:", message)
    return NextResponse.json({ error: "Internal server error", details: message }, { status: 500 })
  }
}