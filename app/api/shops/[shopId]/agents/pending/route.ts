import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  try {
    const { shopId } = await params
    const sql = getDb()

    const agents = await sql`
      SELECT 
        a.id,
        a.name,
        COALESCE(sales_agg.total_commission, 0) - COALESCE(payouts_agg.total_paid, 0) as pending_commission
      FROM shop_agent_links sal
      JOIN agents a ON sal.agent_id = a.id
      LEFT JOIN (
        SELECT agent_id, SUM(commission_amount) as total_commission
        FROM sales
        WHERE shop_id = ${Number(shopId)}
        GROUP BY agent_id
      ) sales_agg ON sales_agg.agent_id = a.id
      LEFT JOIN (
        SELECT agent_id, SUM(amount_paid) as total_paid
        FROM payouts
        WHERE shop_id = ${Number(shopId)} AND person_type = 'agent'
        GROUP BY agent_id
      ) payouts_agg ON payouts_agg.agent_id = a.id
      WHERE sal.shop_id = ${Number(shopId)} AND sal.status = 'active'
        AND COALESCE(sales_agg.total_commission, 0) - COALESCE(payouts_agg.total_paid, 0) > 0
      ORDER BY a.name
    `

    return NextResponse.json({ agents })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("Error:", message)
    return NextResponse.json({ error: "Internal server error", details: message }, { status: 500 })
  }
}