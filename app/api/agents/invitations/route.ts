import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

// GET: Agent sees invitations sent TO them by shops
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get("agentId")
    if (!agentId) return NextResponse.json({ error: "agentId required" }, { status: 400 })

    const sql = getDb()
    const invitations = await sql`
      SELECT alr.*, s.shop_name, s.city || ', ' || s.state as shop_location, s.phone as shop_phone
      FROM agent_link_requests alr
      JOIN shops s ON s.id = alr.shop_id
      WHERE alr.agent_id = ${Number(agentId)} AND alr.status = 'pending' AND alr.requested_by = 'shop'
      ORDER BY alr.requested_at DESC
    `
    return NextResponse.json({ invitations })
  } catch (error) {
    console.error("GET invitations error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// PUT: Agent accepts or rejects an invitation
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { request_id, action } = body // action: 'accept' or 'reject'
    const sql = getDb()

    if (!request_id || !action) {
      return NextResponse.json({ error: "request_id and action required" }, { status: 400 })
    }

    const reqData = await sql`
      SELECT * FROM agent_link_requests WHERE id = ${Number(request_id)} AND status = 'pending'
    `
    if (reqData.length === 0) {
      return NextResponse.json({ error: "Request not found or already processed" }, { status: 404 })
    }

    const { shop_id, agent_id, commission_rate } = reqData[0]

    if (action === 'accept') {
      await sql`
        INSERT INTO shop_agent_links (shop_id, agent_id, commission_rate, status, created_at)
        VALUES (${shop_id}, ${agent_id}, ${commission_rate}, 'active', CURRENT_TIMESTAMP)
      `
      await sql`
        UPDATE agent_link_requests 
        SET status = 'approved', responded_at = CURRENT_TIMESTAMP
        WHERE id = ${Number(request_id)}
      `
      return NextResponse.json({ message: "Invitation accepted. You are now linked to the shop." })
    }

    if (action === 'reject') {
      await sql`
        UPDATE agent_link_requests 
        SET status = 'rejected', responded_at = CURRENT_TIMESTAMP
        WHERE id = ${Number(request_id)}
      `
      return NextResponse.json({ message: "Invitation rejected." })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error: any) {
    console.error("PUT invitation error:", error)
    if (error.message?.includes("UNIQUE constraint")) {
      return NextResponse.json({ error: "Already linked to this shop" }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}