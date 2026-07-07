import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  try {
    const { shopId } = await params
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get("date")
    const sql = getDb()

    const records = await sql`
      SELECT COALESCE(a.staff_id, s.id) as staff_id, s.name as staff_name, s.role, COALESCE(a.status, 'absent') as status, COALESCE(a.work_hours, 0) as work_hours
      FROM staff s
      LEFT JOIN attendance a ON s.id = a.staff_id AND a.attendance_date = ${date}
      WHERE s.shop_id = ${Number(shopId)} AND s.is_active = true
      ORDER BY s.name
    `

    const logs = await sql`
      SELECT l.*, s.name as staff_name, s.role
      FROM attendance_logs l
      JOIN staff s ON l.staff_id = s.id
      WHERE l.shop_id = ${Number(shopId)} AND l.attendance_date = ${date}
      ORDER BY l.logged_at ASC
    `

    return NextResponse.json({ attendance: records, logs })
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
    const sql = getDb()
    const shopIdNum = Number(shopId)
    const actualWorkHours = work_hours ?? (status === "present" ? 8 : status === "half" ? 4 : 0)

    // Insert/update attendance
    await sql`
      INSERT INTO attendance (staff_id, shop_id, attendance_date, status, work_hours)
      VALUES (${staff_id}, ${shopIdNum}, ${date}, ${status}, ${actualWorkHours})
      ON CONFLICT (staff_id, attendance_date) DO UPDATE SET 
        status = ${status}, 
        work_hours = ${actualWorkHours}
    `

    // Insert log
    if (log_type && logged_at) {
      await sql`
        INSERT INTO attendance_logs (shop_id, staff_id, attendance_date, log_type, logged_at, status, notes)
        VALUES (${shopIdNum}, ${staff_id}, ${date}, ${log_type}, ${logged_at}, ${status}, ${notes || null})
      `
    }

    // Get staff details
    const staffResult = await sql`
      SELECT * FROM staff WHERE id = ${staff_id} AND shop_id = ${shopIdNum}
    `
    if (staffResult.length === 0) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 })
    }
    const staff = staffResult[0]

    // Calculate salary based on attendance
    const monthStr = date?.slice(0, 7) + "-01"

    // Count attendance for this month
    const monthAttendance = await sql`
      SELECT 
        SUM(CASE WHEN status = 'present' THEN 1 WHEN status = 'half' THEN 0.5 ELSE 0 END) as present_days,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_days,
        SUM(COALESCE(overtime_hours, 0)) as total_overtime
      FROM attendance
      WHERE staff_id = ${staff_id} AND shop_id = ${shopIdNum} 
        AND attendance_date >= ${monthStr} AND attendance_date <= ${date}
    `

    const presentDays = Number(monthAttendance[0]?.present_days || 0)
    const absentDays = Number(monthAttendance[0]?.absent_days || 0)
    const totalOvertime = Number(monthAttendance[0]?.total_overtime || 0)

    // Calculate amounts
    const dailyRate = Number(staff.base_salary) / 30
    const earned = presentDays * dailyRate
    const overtimeAmount = totalOvertime * (dailyRate / 8) * 1.5 // 1.5x for overtime

    // Get total advances for this month
    const advanceResult = await sql`
      SELECT COALESCE(SUM(amount_paid), 0) as total_advance
      FROM payouts
      WHERE staff_id = ${staff_id} AND shop_id = ${shopIdNum} 
        AND is_advance = 1 AND payment_date >= ${monthStr} AND payment_date <= ${date}
    `
    const totalAdvance = Number(advanceResult[0]?.total_advance || 0)

    const finalPayable = Math.max(earned + overtimeAmount - totalAdvance, 0)

    // Upsert salary record
    await sql`
      INSERT INTO salary (
        staff_id, shop_id, month, total_days, present_days, absent_days,
        base_salary, overtime_amount, advances, final_payable, status
      ) VALUES (
        ${staff_id}, ${shopIdNum}, ${monthStr}, 30, ${presentDays}, ${absentDays},
        ${staff.base_salary}, ${overtimeAmount}, ${totalAdvance}, ${finalPayable}, 'pending'
      )
      ON CONFLICT (staff_id, month) DO UPDATE SET
        present_days = ${presentDays},
        absent_days = ${absentDays},
        base_salary = ${staff.base_salary},
        overtime_amount = ${overtimeAmount},
        advances = ${totalAdvance},
        final_payable = ${finalPayable},
        status = CASE WHEN ${finalPayable} <= 0 THEN 'paid' ELSE 'pending' END
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("POST Error:", message)
    return NextResponse.json({ error: "Internal server error", details: message }, { status: 500 })
  }
}