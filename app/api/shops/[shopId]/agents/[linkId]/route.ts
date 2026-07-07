import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ shopId: string; linkId: string }> },
) {
  try {
    const { shopId, linkId } = await params
    const body = await request.json()
    const sql = getDb()

    const linkResult = await sql`
      SELECT agent_id FROM shop_agent_links
      WHERE id = ${Number(linkId)} AND shop_id = ${Number(shopId)}
    `

    if (linkResult.length === 0) {
      return NextResponse.json({ error: "Agent link not found" }, { status: 404 })
    }

    const agentId = linkResult[0].agent_id

    await sql`
      UPDATE agents
      SET
        name = ${body.name ?? null},
        phone_number = ${body.phone_number ?? null},
        description = ${body.description ?? null},
        account_name = ${body.account_name ?? null},
        account_number = ${body.account_number ?? null},
        bank_name = ${body.bank_name ?? null},
        ifsc_code = ${body.ifsc_code ?? null},
        upi_id = ${body.upi_id ?? null}
      WHERE id = ${agentId}
    `

    if (body.commission_rate !== undefined) {
      await sql`
        UPDATE shop_agent_links
        SET commission_rate = ${body.commission_rate}
        WHERE id = ${Number(linkId)} AND shop_id = ${Number(shopId)}
      `
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating agent:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ shopId: string; linkId: string }> },
) {
  try {
    const { shopId, linkId } = await params
    const sql = getDb()

    const linkResult = await sql`
      SELECT agent_id FROM shop_agent_links
      WHERE id = ${Number(linkId)} AND shop_id = ${Number(shopId)}
    `

    if (linkResult.length === 0) {
      return NextResponse.json({ error: "Agent link not found" }, { status: 404 })
    }

    const agentId = linkResult[0].agent_id
    const remainingLinks = await sql`
      SELECT id FROM shop_agent_links
      WHERE agent_id = ${agentId}
    `

    await sql`
      DELETE FROM shop_agent_links
      WHERE id = ${Number(linkId)} AND shop_id = ${Number(shopId)}
    `

    if (remainingLinks.length <= 1) {
      await sql`
        UPDATE agents
        SET is_active = false
        WHERE id = ${agentId}
      `
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing agent:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
