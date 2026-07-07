import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function POST(request: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  try {
    const { shopId } = await params
    const { month } = await request.json()
    const sql = getDb()

    if (!month) {
      return NextResponse.json({ error: "Month is required" }, { status: 400 })
    }

    // Get all active staff for the shop
    const staff = await sql`SELECT id, base_salary FROM staff WHERE shop_id = ${Number(shopId)} AND is_active = true`

    // For each staff member, calculate salary based on attendance for the given month
    for (const member of staff) {
      const attendance = await sql`
        SELECT COUNT(CASE WHEN status = 'present' THEN 1 END) as present_days,
               COUNT(CASE WHEN status = 'half' THEN 1 END) * 0.5 as half_days
        FROM attendance
        WHERE staff_id = ${member.id} AND DATE_TRUNC('month', attendance_date) = DATE_TRUNC('month', ${month})
      `

      const presentDays = (attendance[0]?.present_days || 0) + (attendance[0]?.half_days || 0)
      const advances = await sql`
        SELECT COALESCE(SUM(amount), 0) as total FROM withdrawals
        WHERE staff_id = ${member.id} AND DATE_TRUNC('month', withdrawal_date) = DATE_TRUNC('month', ${month})
      `

      const finalPayable = (member.base_salary / 30) * presentDays - (advances[0]?.total || 0)

      await sql`
        INSERT INTO salary (staff_id, shop_id, month, base_salary, present_days, final_payable, status)
        VALUES (${member.id}, ${Number(shopId)}, ${month}, ${member.base_salary}, ${Math.round(presentDays)}, ${finalPayable}, 'pending')
        ON CONFLICT (staff_id, month) DO UPDATE SET final_payable = ${finalPayable}
      `
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error generating salary:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
