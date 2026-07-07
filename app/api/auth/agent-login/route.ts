import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    let body: any = {}
    try {
      body = await request.json()
    } catch (parseError) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const { phone_number } = body

    if (!phone_number || typeof phone_number !== "string") {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 })
    }

    const sql = getDb()
    
    let agents: any[] = []
    try {
      agents = await sql`
        SELECT id, unique_id, name, phone_number
        FROM agents 
        WHERE phone_number = ${phone_number} AND is_active = 1
        LIMIT 1
      `
    } catch (dbError: any) {
      console.error("DB Error:", dbError)
      return NextResponse.json({ error: "Database error", details: dbError.message }, { status: 500 })
    }

    if (agents.length === 0) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

    const agent = agents[0]

    return NextResponse.json({
      success: true,
      agent: {
        id: agent.id,
        unique_id: agent.unique_id,
        name: agent.name,
        phone_number: agent.phone_number,
      },
      token: `agent_${agent.id}_${Date.now()}`,
    })

  } catch (error: any) {
    console.error("Unhandled login error:", error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}

// Also handle GET to prevent 404 HTML
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}