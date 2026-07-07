import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const phone = searchParams.get("phone")
    if (!phone) return NextResponse.json({ error: "Phone required" }, { status: 400 })

    const sql = getDb()
    const agent = await sql`
      SELECT id, name, phone_number, description, account_name, bank_name, upi_id
      FROM agents
      WHERE phone_number = ${phone}
      LIMIT 1
    `

    if (agent.length === 0) {
      return NextResponse.json({ agent: null })
    }

    return NextResponse.json({ agent: agent[0] })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}