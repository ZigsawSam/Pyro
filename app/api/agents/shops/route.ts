import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get("agentId")
    const search = searchParams.get("search") || ""
    if (!agentId) return NextResponse.json({ error: "agentId required" }, { status: 400 })

    const sql = getDb()
    const agentIdNum = Number(agentId)
    const searchTerm = `%${search}%`

    const shops = await sql`
      SELECT 
        s.id,
        s.shop_name as name,
        s.owner_name,
        s.phone,
        s.city || ', ' || s.state as location,
        CASE 
          WHEN sal.id IS NOT NULL AND sal.status = 'active' THEN 'linked'
          WHEN alr.status = 'pending' THEN 'pending'
          ELSE 'available'
        END as connection_status,
        alr.commission_rate as requested_rate,
        alr.id as request_id
      FROM shops s
      LEFT JOIN shop_agent_links sal ON sal.shop_id = s.id AND sal.agent_id = ${agentIdNum} AND sal.status = 'active'
      LEFT JOIN agent_link_requests alr ON alr.shop_id = s.id AND alr.agent_id = ${agentIdNum}
      WHERE s.shop_name LIKE ${searchTerm} 
         OR s.owner_name LIKE ${searchTerm} 
         OR s.phone LIKE ${searchTerm}
      ORDER BY s.shop_name
      LIMIT 20
    `

    return NextResponse.json({ shops })
  } catch (error) {
    console.error("GET shops error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}