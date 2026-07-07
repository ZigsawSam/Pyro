import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  try {
    const { agentId } = await params
    const sql = getDb()

    // Get all shops agent works with
    const shops = await sql`
      SELECT 
        s.id as shop_id,
        s.shop_name,
        sal.commission_rate,
        COALESCE(sales_agg.total_sales, 0) as total_sales,
        COALESCE(sales_agg.total_commission, 0) as total_commission,
        COALESCE(payouts_agg.total_paid, 0) as paid_commission,
        COALESCE(sales_agg.total_commission, 0) - COALESCE(payouts_agg.total_paid, 0) as pending_commission
      FROM shop_agent_links sal
      JOIN shops s ON sal.shop_id = s.id
      LEFT JOIN (
        SELECT shop_id, agent_id, SUM(amount) as total_sales, SUM(commission_amount) as total_commission
        FROM sales
        WHERE agent_id = ${Number(agentId)}
        GROUP BY shop_id, agent_id
      ) sales_agg ON sales_agg.shop_id = s.id AND sales_agg.agent_id = sal.agent_id
      LEFT JOIN (
        SELECT shop_id, agent_id, SUM(amount_paid) as total_paid
        FROM payouts
        WHERE agent_id = ${Number(agentId)}
        GROUP BY shop_id, agent_id
      ) payouts_agg ON payouts_agg.shop_id = s.id AND payouts_agg.agent_id = sal.agent_id
      WHERE sal.agent_id = ${Number(agentId)} AND sal.status = 'active'
      ORDER BY s.shop_name
    `

    // Calculate totals
    const totals = {
      total_sales: 0,
      total_commission: 0,
      paid_commission: 0,
      pending_commission: 0,
    }

    shops.forEach((shop: any) => {
      totals.total_sales += shop.total_sales || 0
      totals.total_commission += shop.total_commission || 0
      totals.paid_commission += shop.paid_commission || 0
      totals.pending_commission += shop.pending_commission || 0
    })

    return NextResponse.json({ shops, totals })
  } catch (error) {
    console.error("Error fetching agent dashboard:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
