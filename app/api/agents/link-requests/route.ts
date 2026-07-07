import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { agent_id, shop_id, commission_rate, message } = body
    const sql = getDb()

    if (!agent_id || !shop_id || commission_rate === undefined) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    // Check if already linked (active)
    const existing = await sql`
      SELECT id FROM shop_agent_links 
      WHERE shop_id = ${Number(shop_id)} AND agent_id = ${Number(agent_id)} AND status = 'active'
    `
    if (existing.length > 0) {
      return NextResponse.json({ error: "Already linked to this shop" }, { status: 409 })
    }

    // Check if there's a PENDING request (not rejected/approved)
    const pending = await sql`
      SELECT id, status FROM agent_link_requests 
      WHERE shop_id = ${Number(shop_id)} AND agent_id = ${Number(agent_id)} AND status = 'pending'
    `
    if (pending.length > 0) {
      return NextResponse.json({ error: "Already requested. Wait for response or cancel." }, { status: 409 })
    }

    const result = await sql`
      INSERT INTO agent_link_requests (shop_id, agent_id, commission_rate, status, requested_by, message)
      VALUES (${Number(shop_id)}, ${Number(agent_id)}, ${Number(commission_rate)}, 'pending', 'agent', ${message || null})
      RETURNING *
    `

    return NextResponse.json(result[0], { status: 201 })
  } catch (error: any) {
    console.error("POST link request error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}