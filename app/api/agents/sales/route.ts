import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get("agentId")
    const shopId = searchParams.get("shopId")
    const from = searchParams.get("from")
    const to = searchParams.get("to")
    
    if (!agentId) return NextResponse.json({ error: "agentId required" }, { status: 400 })

    const sql = getDb()
    const agentIdNum = Number(agentId)

    // Build query with proper conditions
    let sales: any[] = []

    if (shopId && from && to) {
      sales = await sql`
        SELECT s.id, s.shop_id, sh.shop_name, s.amount, s.commission_amount, s.sale_date, s.notes
        FROM sales s
        JOIN shops sh ON sh.id = s.shop_id
        WHERE s.agent_id = ${agentIdNum}
          AND s.shop_id = ${Number(shopId)}
          AND s.sale_date >= ${from}
          AND s.sale_date <= ${to}
        ORDER BY s.sale_date DESC, s.id DESC
      `
    } else if (shopId && from) {
      sales = await sql`
        SELECT s.id, s.shop_id, sh.shop_name, s.amount, s.commission_amount, s.sale_date, s.notes
        FROM sales s
        JOIN shops sh ON sh.id = s.shop_id
        WHERE s.agent_id = ${agentIdNum}
          AND s.shop_id = ${Number(shopId)}
          AND s.sale_date >= ${from}
        ORDER BY s.sale_date DESC, s.id DESC
      `
    } else if (shopId && to) {
      sales = await sql`
        SELECT s.id, s.shop_id, sh.shop_name, s.amount, s.commission_amount, s.sale_date, s.notes
        FROM sales s
        JOIN shops sh ON sh.id = s.shop_id
        WHERE s.agent_id = ${agentIdNum}
          AND s.shop_id = ${Number(shopId)}
          AND s.sale_date <= ${to}
        ORDER BY s.sale_date DESC, s.id DESC
      `
    } else if (from && to) {
      sales = await sql`
        SELECT s.id, s.shop_id, sh.shop_name, s.amount, s.commission_amount, s.sale_date, s.notes
        FROM sales s
        JOIN shops sh ON sh.id = s.shop_id
        WHERE s.agent_id = ${agentIdNum}
          AND s.sale_date >= ${from}
          AND s.sale_date <= ${to}
        ORDER BY s.sale_date DESC, s.id DESC
      `
    } else if (shopId) {
      sales = await sql`
        SELECT s.id, s.shop_id, sh.shop_name, s.amount, s.commission_amount, s.sale_date, s.notes
        FROM sales s
        JOIN shops sh ON sh.id = s.shop_id
        WHERE s.agent_id = ${agentIdNum}
          AND s.shop_id = ${Number(shopId)}
        ORDER BY s.sale_date DESC, s.id DESC
      `
    } else if (from) {
      sales = await sql`
        SELECT s.id, s.shop_id, sh.shop_name, s.amount, s.commission_amount, s.sale_date, s.notes
        FROM sales s
        JOIN shops sh ON sh.id = s.shop_id
        WHERE s.agent_id = ${agentIdNum}
          AND s.sale_date >= ${from}
        ORDER BY s.sale_date DESC, s.id DESC
      `
    } else if (to) {
      sales = await sql`
        SELECT s.id, s.shop_id, sh.shop_name, s.amount, s.commission_amount, s.sale_date, s.notes
        FROM sales s
        JOIN shops sh ON sh.id = s.shop_id
        WHERE s.agent_id = ${agentIdNum}
          AND s.sale_date <= ${to}
        ORDER BY s.sale_date DESC, s.id DESC
      `
    } else {
      sales = await sql`
        SELECT s.id, s.shop_id, sh.shop_name, s.amount, s.commission_amount, s.sale_date, s.notes
        FROM sales s
        JOIN shops sh ON sh.id = s.shop_id
        WHERE s.agent_id = ${agentIdNum}
        ORDER BY s.sale_date DESC, s.id DESC
      `
    }

    return NextResponse.json({ sales })
  } catch (error) {
    console.error("GET sales error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}