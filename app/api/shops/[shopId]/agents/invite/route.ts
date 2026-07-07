import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function POST(request: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  try {
    const { shopId } = await params
    const body = await request.json()
    const { phone_number, commission_rate, message } = body
    const sql = getDb()
    const shopIdNum = Number(shopId)

    if (!phone_number || commission_rate === undefined) {
      return NextResponse.json({ error: "Phone and commission rate required" }, { status: 400 })
    }

    // Find agent by phone
    const agent = await sql`
      SELECT id, name, phone_number, description, account_name, bank_name, upi_id 
      FROM agents WHERE phone_number = ${phone_number}
    `
    
    let agentId: number
    let isNewAgent = false

    if (agent.length === 0) {
      const newAgent = await sql`
        INSERT INTO agents (unique_id, name, phone_number, is_active, created_at)
        VALUES (${`AGT_${Date.now()}`}, ${phone_number}, ${phone_number}, 1, CURRENT_TIMESTAMP)
        RETURNING id
      `
      agentId = newAgent[0].id
      isNewAgent = true
    } else {
      agentId = agent[0].id
    }

    // Check if already linked (active)
    const existing = await sql`
      SELECT id FROM shop_agent_links 
      WHERE shop_id = ${shopIdNum} AND agent_id = ${agentId} AND status = 'active'
    `
    if (existing.length > 0) {
      return NextResponse.json({ error: "Already linked to this shop" }, { status: 409 })
    }

    // Check if there's a PENDING request
    const pending = await sql`
      SELECT id, status FROM agent_link_requests 
      WHERE shop_id = ${shopIdNum} AND agent_id = ${agentId} AND status = 'pending'
    `
    if (pending.length > 0) {
      return NextResponse.json({ error: "Request already pending" }, { status: 409 })
    }

    const result = await sql`
      INSERT INTO agent_link_requests (shop_id, agent_id, commission_rate, status, requested_by, message)
      VALUES (${shopIdNum}, ${agentId}, ${Number(commission_rate)}, 'pending', 'shop', ${message || null})
      RETURNING *
    `

    return NextResponse.json({ 
      message: isNewAgent 
        ? "Invitation sent. Agent account created." 
        : "Invitation sent to existing agent.",
      request: result[0],
      agent_id: agentId,
      is_new_agent: isNewAgent
    }, { status: 201 })
    } catch (error: any) {
    console.error("Invite error:", error)
    if (error.message?.includes("UNIQUE constraint")) {
      return NextResponse.json({ error: "Request already exists or was previously made" }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}