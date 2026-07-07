import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  try {
    const { agentId } = await params
    const searchParams = request.nextUrl.searchParams
    const shopId = searchParams.get("shop_id")

    const sql = getDb()

    // Get shop name
    const shopResult = await sql`SELECT shop_name FROM shops WHERE id = ${Number(shopId)}`
    const shopName = shopResult[0]?.shop_name || "Unknown Shop"

    // Get all commissions for agent in this shop
    const commissions = await sql`
      SELECT 
        s.id as sale_id,
        s.amount,
        s.commission_amount,
        s.sale_date,
        CASE WHEN EXISTS (
          SELECT 1 FROM payouts p WHERE p.agent_id = s.agent_id AND p.shop_id = s.shop_id
        ) THEN true ELSE false END as paid
      FROM sales s
      WHERE s.agent_id = ${Number(agentId)} AND s.shop_id = ${Number(shopId)}
      ORDER BY s.sale_date DESC
    `

    return NextResponse.json({ commissions, shop_name: shopName })
  } catch (error) {
    console.error("Error fetching commissions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
