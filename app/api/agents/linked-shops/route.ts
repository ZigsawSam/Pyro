import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get("agentId")
    if (!agentId) return NextResponse.json({ error: "agentId required" }, { status: 400 })

    const sql = getDb()
    const agentIdNum = Number(agentId)

    const shops = await sql`
      SELECT 
        s.id as shop_id,
        s.shop_name,
        sal.commission_rate,
        COALESCE(sales_agg.total_sales, 0) as total_sales,
        COALESCE(sales_agg.total_commission, 0) as total_commission,
        CASE 
          WHEN COALESCE(sales_agg.total_commission, 0) - COALESCE(payouts_agg.total_paid, 0) - COALESCE(advance_agg.total_advance, 0) < 0 
          THEN 0 
          ELSE COALESCE(sales_agg.total_commission, 0) - COALESCE(payouts_agg.total_paid, 0) - COALESCE(advance_agg.total_advance, 0) 
        END as pending_commission
      FROM shop_agent_links sal
      JOIN shops s ON s.id = sal.shop_id
      LEFT JOIN (
        SELECT shop_id, SUM(amount) as total_sales, SUM(commission_amount) as total_commission
        FROM sales
        WHERE agent_id = ${agentIdNum}
        GROUP BY shop_id
      ) sales_agg ON sales_agg.shop_id = s.id
      LEFT JOIN (
        SELECT shop_id, SUM(amount_paid) as total_paid
        FROM payouts
        WHERE agent_id = ${agentIdNum} AND person_type = 'agent' AND is_advance = 0
        GROUP BY shop_id
      ) payouts_agg ON payouts_agg.shop_id = s.id
      LEFT JOIN (
        SELECT shop_id, SUM(amount_paid) as total_advance
        FROM payouts
        WHERE agent_id = ${agentIdNum} AND person_type = 'agent' AND is_advance = 1
        GROUP BY shop_id
      ) advance_agg ON advance_agg.shop_id = s.id
      WHERE sal.agent_id = ${agentIdNum} AND sal.status = 'active'
      ORDER BY s.shop_name
    `

    return NextResponse.json({ shops })
  } catch (error) {
    console.error("GET linked shops error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}