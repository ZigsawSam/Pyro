import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  try {
    const { shopId } = await params
    const sql = getDb()

    // Agent commission report
    const agentReport = await sql`
      SELECT 
        a.name as agent_name,
        COALESCE(SUM(s.amount), 0) as total_sales,
        COALESCE(SUM(s.commission_amount), 0) as commission
      FROM shop_agent_links sal
      JOIN agents a ON sal.agent_id = a.id
      LEFT JOIN sales s ON s.agent_id = a.id AND s.shop_id = ${Number(shopId)}
      WHERE sal.shop_id = ${Number(shopId)}
      GROUP BY a.name
      ORDER BY total_sales DESC
      LIMIT 10
    `

    // Payroll report
    const payrollReport = await sql`
      SELECT 
        TO_CHAR(month, 'Mon YYYY') as month,
        COALESCE(SUM(final_payable), 0) as total_paid,
        COUNT(DISTINCT staff_id) as total_staff
      FROM salary
      WHERE shop_id = ${Number(shopId)}
      GROUP BY month
      ORDER BY month DESC
      LIMIT 12
    `

    // Calculate totals
    const totalsResult = await sql`
      SELECT 
        (SELECT COALESCE(SUM(amount), 0) FROM sales WHERE shop_id = ${Number(shopId)}) as total_sales,
        (SELECT COALESCE(SUM(amount_paid), 0) FROM payouts WHERE shop_id = ${Number(shopId)}) as total_commission,
        (SELECT COALESCE(SUM(final_payable), 0) FROM salary WHERE shop_id = ${Number(shopId)}) as total_payroll
    `

    return NextResponse.json({
      agent_report: agentReport,
      payroll_report: payrollReport,
      totals: {
        sales: totalsResult[0]?.total_sales || 0,
        commission: totalsResult[0]?.total_commission || 0,
        payroll: totalsResult[0]?.total_payroll || 0,
      },
    })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
