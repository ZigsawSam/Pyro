import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { generateAgentId } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const phone = searchParams.get("phone")
    const sql = getDb()

    if (phone) {
      const agents = await sql`
        SELECT id, unique_id, name, phone_number, description, account_name, account_number, bank_name, ifsc_code, upi_id
        FROM agents WHERE phone_number = ${phone} AND is_active = true
      `
      return NextResponse.json(agents)
    }

    return NextResponse.json([])
  } catch (error) {
    console.error("Error fetching agents:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const sql = getDb()

    const agent = await sql`
      INSERT INTO agents (
        unique_id, name, phone_number, description, account_name, account_number,
        bank_name, ifsc_code, upi_id, is_active
      ) VALUES (
        ${generateAgentId()},
        ${body.name},
        ${body.phone_number},
        ${body.description || null},
        ${body.account_name || null},
        ${body.account_number || null},
        ${body.bank_name || null},
        ${body.ifsc_code || null},
        ${body.upi_id || null},
        true
      )
      RETURNING id, unique_id, name, phone_number, description
    `

    return NextResponse.json(agent[0], { status: 201 })
  } catch (error) {
    console.error("Error creating agent:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
