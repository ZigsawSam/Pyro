import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  try {
    const { shopId } = await params
    const sql = getDb()

    // Verify shop exists
    const shop = await sql`SELECT id, shop_name FROM shops WHERE id = ${Number(shopId)}`
    if (shop.length === 0) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    // Get all dashboard metrics
    const totalSalesResult = await sql`
      SELECT COALESCE(SUM(amount), 0) as total FROM sales WHERE shop_id = ${Number(shopId)}
    `

    const commissionResult = await sql`
      SELECT 
        COALESCE(SUM(commission_amount), 0) as total_commission,
        COALESCE((SELECT SUM(amount_paid) FROM payouts WHERE shop_id = ${Number(shopId)}), 0) as paid
      FROM sales WHERE shop_id = ${Number(shopId)}
    `

    const staffResult =
      await sql`SELECT COUNT(*) as total FROM staff WHERE shop_id = ${Number(shopId)} AND is_active = true`

    const pendingSalaryResult = await sql`
      SELECT COALESCE(SUM(final_payable), 0) as total FROM salary 
      WHERE shop_id = ${Number(shopId)} AND status = 'pending'
    `

    const attendanceTodayResult = await sql`
      SELECT COUNT(*) as total FROM attendance 
      WHERE shop_id = ${Number(shopId)} AND attendance_date = CURRENT_DATE AND status = 'present'
    `

    return NextResponse.json({
      data: {
        total_sales: totalSalesResult[0]?.total || 0,
        pending_commission: (commissionResult[0]?.total_commission || 0) - (commissionResult[0]?.paid || 0),
        paid_commission: commissionResult[0]?.paid || 0,
        total_staff: staffResult[0]?.total || 0,
        pending_salary: pendingSalaryResult[0]?.total || 0,
        attendance_today: attendanceTodayResult[0]?.total || 0,
      },
      shopName: shop[0].shop_name,
    })
  } catch (error) {
    console.error("Dashboard error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
