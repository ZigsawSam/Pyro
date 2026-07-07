import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  try {
    const { shopId } = await params
    const sql = getDb()

    const sales = await sql`
      SELECT s.*, a.name as agent_name
      FROM sales s
      JOIN agents a ON s.agent_id = a.id
      WHERE s.shop_id = ${Number(shopId)}
      ORDER BY s.sale_date DESC
    `

    return NextResponse.json({ sales })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  try {
    const { shopId } = await params
    const { agent_id, amount, notes } = await request.json()
    const sql = getDb()

    // Get commission rate for this agent-shop pair
    const link = await sql`
      SELECT commission_rate FROM shop_agent_links
      WHERE shop_id = ${Number(shopId)} AND agent_id = ${agent_id}
    `

    if (link.length === 0) return NextResponse.json({ error: "Agent not found" }, { status: 400 })

    const commissionAmount = (amount * link[0].commission_rate) / 100

    const sale = await sql`
      INSERT INTO sales (shop_id, agent_id, amount, commission_amount, sale_date, notes)
      VALUES (${Number(shopId)}, ${agent_id}, ${amount}, ${commissionAmount}, CURRENT_DATE, ${notes || null})
      RETURNING *
    `

    return NextResponse.json(sale[0], { status: 201 })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
