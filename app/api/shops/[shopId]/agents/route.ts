import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  try {
    const { shopId } = await params
    const sql = getDb()

    const agents = await sql`
      SELECT 
        sal.id as link_id,
        a.id,
        a.name,
        a.phone_number,
        a.description,
        a.account_name,
        a.account_number,
        a.bank_name,
        a.ifsc_code,
        a.upi_id,
        sal.commission_rate,
        COALESCE(sales_agg.total_sales, 0) as total_sales,
        COALESCE(sales_agg.total_commission, 0) as total_commission,
        COALESCE(payouts_agg.total_paid, 0) as paid_commission,
        COALESCE(advance_agg.total_advance, 0) as total_advance,
        CASE 
          WHEN COALESCE(sales_agg.total_commission, 0) - COALESCE(payouts_agg.total_paid, 0) - COALESCE(advance_agg.total_advance, 0) < 0 
          THEN 0 
          ELSE COALESCE(sales_agg.total_commission, 0) - COALESCE(payouts_agg.total_paid, 0) - COALESCE(advance_agg.total_advance, 0) 
        END as pending_commission
      FROM shop_agent_links sal
      JOIN agents a ON sal.agent_id = a.id
      LEFT JOIN (
        SELECT agent_id, SUM(amount) as total_sales, SUM(commission_amount) as total_commission
        FROM sales
        WHERE shop_id = ${Number(shopId)}
        GROUP BY agent_id
      ) sales_agg ON sales_agg.agent_id = a.id
      LEFT JOIN (
        SELECT agent_id, SUM(amount_paid) as total_paid
        FROM payouts
        WHERE shop_id = ${Number(shopId)} AND person_type = 'agent' AND is_advance = 0
        GROUP BY agent_id
      ) payouts_agg ON payouts_agg.agent_id = a.id
      LEFT JOIN (
        SELECT agent_id, SUM(amount_paid) as total_advance
        FROM payouts
        WHERE shop_id = ${Number(shopId)} AND person_type = 'agent' AND is_advance = 1
        GROUP BY agent_id
      ) advance_agg ON advance_agg.agent_id = a.id
      WHERE sal.shop_id = ${Number(shopId)} AND sal.status = 'active'
      ORDER BY a.name
    `

    return NextResponse.json({ agents })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("Error fetching agents:", message)
    return NextResponse.json({ error: "Internal server error", details: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  try {
    const { shopId } = await params
    const body = await request.json()
    const { name, phone_number, commission_rate, description, account_name, account_number, bank_name, ifsc_code, upi_id } = body
    const sql = getDb()
    const shopIdNum = Number(shopId)

    if (!name || !phone_number || commission_rate === undefined) {
      return NextResponse.json({ error: "Name, phone and commission rate required" }, { status: 400 })
    }

    // Check if agent already exists by phone
    const existingAgent = await sql`
      SELECT id FROM agents WHERE phone_number = ${phone_number}
    `

    let agentId: number

    if (existingAgent.length > 0) {
      agentId = existingAgent[0].id
      await sql`
        UPDATE agents 
        SET name = ${name},
            description = ${description || null},
            account_name = ${account_name || null},
            account_number = ${account_number || null},
            bank_name = ${bank_name || null},
            ifsc_code = ${ifsc_code || null},
            upi_id = ${upi_id || null}
        WHERE id = ${agentId}
      `
    } else {
      const newAgent = await sql`
        INSERT INTO agents (unique_id, name, phone_number, description, account_name, account_number, bank_name, ifsc_code, upi_id, is_active)
        VALUES (${`AGT_${Date.now()}`}, ${name}, ${phone_number}, ${description || null}, ${account_name || null}, ${account_number || null}, ${bank_name || null}, ${ifsc_code || null}, ${upi_id || null}, 1)
        RETURNING id
      `
      agentId = newAgent[0].id
    }

    // Check if already linked to this shop
    const existingLink = await sql`
      SELECT id FROM shop_agent_links 
      WHERE shop_id = ${shopIdNum} AND agent_id = ${agentId}
    `
    if (existingLink.length > 0) {
      return NextResponse.json({ error: "Agent already linked to this shop" }, { status: 409 })
    }

    // Check if there's a pending request (block manual add if pending exists)
    const pending = await sql`
      SELECT id FROM agent_link_requests 
      WHERE shop_id = ${shopIdNum} AND agent_id = ${agentId} AND status = 'pending'
    `
    if (pending.length > 0) {
      return NextResponse.json({ error: "There's a pending request with this agent. Resolve it first." }, { status: 409 })
    }

    // Create link directly (manual add bypasses request system)
    const link = await sql`
      INSERT INTO shop_agent_links (shop_id, agent_id, commission_rate, status, created_at)
      VALUES (${shopIdNum}, ${agentId}, ${Number(commission_rate)}, 'active', CURRENT_TIMESTAMP)
      RETURNING *
    `

    return NextResponse.json({ 
      message: "Agent linked successfully",
      link: link[0],
      agent_id: agentId
    }, { status: 201 })
  } catch (error: any) {
    if (error.message?.includes("UNIQUE constraint")) {
      return NextResponse.json({ error: "Agent already linked" }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}