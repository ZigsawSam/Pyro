import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { generateAgentId } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const { name, phoneNumber, accountName, accountNumber, bankName, ifscCode, upiId } =
      await request.json()

    if (!name || !phoneNumber) {
      return NextResponse.json({ error: "Name and phone number are required" }, { status: 400 })
    }

    const sql = getDb()

    // Check if agent with this phone already exists
    const existingAgents = await sql`
      SELECT id FROM agents WHERE phone_number = ${phoneNumber}
    `

    if (existingAgents.length > 0) {
      return NextResponse.json(
        { error: "Agent with this phone number already exists" },
        { status: 400 }
      )
    }

    // Create new agent
    const agentId = generateAgentId()
    const result = await sql`
      INSERT INTO agents (
        unique_id, name, phone_number, account_name, account_number, 
        bank_name, ifsc_code, upi_id, is_active, created_at, updated_at,
        total_sales_this_month, total_commission_this_month
      )
      VALUES (
        ${agentId}, ${name}, ${phoneNumber}, ${accountName || null}, 
        ${accountNumber || null}, ${bankName || null}, ${ifscCode || null}, 
        ${upiId || null}, true, NOW(), NOW(), 0, 0
      )
      RETURNING id, unique_id, name, phone_number
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Failed to create agent" }, { status: 500 })
    }

    const agent = result[0]

    return NextResponse.json({
      agent: {
        id: agent.id,
        unique_id: agent.unique_id,
        name: agent.name,
        phoneNumber: agent.phone_number,
      },
      token: Buffer.from(JSON.stringify({ agentId: agent.id })).toString("base64"),
    })
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
