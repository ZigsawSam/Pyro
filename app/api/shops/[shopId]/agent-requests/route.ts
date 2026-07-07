import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  try {
    const { shopId } = await params
    const sql = getDb()
    const shopIdNum = Number(shopId)

    const requests = await sql`
      SELECT 
        alr.*, 
        a.name as agent_name, 
        a.phone_number as agent_phone,
        a.description as agent_description,
        a.account_name as agent_account_name,
        a.bank_name as agent_bank_name,
        a.upi_id as agent_upi_id
      FROM agent_link_requests alr
      JOIN agents a ON a.id = alr.agent_id
      WHERE alr.shop_id = ${shopIdNum} AND alr.status = 'pending'
      ORDER BY alr.requested_at DESC
    `

    return NextResponse.json({ requests })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  try {
    const { shopId } = await params
    const body = await request.json()
    const { request_id, action, commission_rate } = body
    const sql = getDb()
    const shopIdNum = Number(shopId)

    if (!request_id || !action) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    const reqData = await sql`
      SELECT * FROM agent_link_requests WHERE id = ${Number(request_id)} AND shop_id = ${shopIdNum}
    `
    if (reqData.length === 0) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    if (action === 'approve') {
      const rate = commission_rate !== undefined ? Number(commission_rate) : reqData[0].commission_rate
      
      await sql`
        INSERT INTO shop_agent_links (shop_id, agent_id, commission_rate, status, created_at)
        VALUES (${shopIdNum}, ${reqData[0].agent_id}, ${rate}, 'active', CURRENT_TIMESTAMP)
      `
      
      await sql`
        UPDATE agent_link_requests 
        SET status = 'approved', responded_at = CURRENT_TIMESTAMP
        WHERE id = ${Number(request_id)}
      `

      return NextResponse.json({ message: "Agent approved and linked" })
    }

    if (action === 'reject') {
      await sql`
        UPDATE agent_link_requests 
        SET status = 'rejected', responded_at = CURRENT_TIMESTAMP
        WHERE id = ${Number(request_id)}
      `
      return NextResponse.json({ message: "Request rejected" })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error: any) {
    if (error.message?.includes("UNIQUE constraint")) {
      return NextResponse.json({ error: "Agent already linked" }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}