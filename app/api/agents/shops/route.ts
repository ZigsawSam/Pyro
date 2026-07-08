import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get("agentId")
    const search = searchParams.get("search") || ""
    if (!agentId) return NextResponse.json({ error: "agentId required" }, { status: 400 })

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const agentIdNum = Number(agentId)

    // Get all shops with search filter
    const { data: shops, error: shopsError } = await supabase
      .from("shops")
      .select("id, shop_name, owner_name, phone, city, state")
      .or(`shop_name.ilike.%${search}%,owner_name.ilike.%${search}%,phone.ilike.%${search}%`)
      .limit(20)

    if (shopsError) {
      console.error("GET shops error:", shopsError)
      return NextResponse.json({ error: shopsError.message }, { status: 500 })
    }

    // Get active links for this agent
    const { data: links, error: linksError } = await supabase
      .from("shop_agent_links")
      .select("shop_id, status")
      .eq("agent_id", agentIdNum)
      .eq("status", "active")

    if (linksError) {
      console.error("GET links error:", linksError)
      return NextResponse.json({ error: linksError.message }, { status: 500 })
    }

    // Get pending requests for this agent
    const { data: requests, error: requestsError } = await supabase
      .from("agent_link_requests")
      .select("shop_id, commission_rate, id, status")
      .eq("agent_id", agentIdNum)

    if (requestsError) {
      console.error("GET requests error:", requestsError)
      return NextResponse.json({ error: requestsError.message }, { status: 500 })
    }

    const linkMap = new Map(links?.map((l: any) => [l.shop_id, l.status]) || [])
    const requestMap = new Map(requests?.map((r: any) => [r.shop_id, r]) || [])

    const formatted = shops?.map((shop: any) => {
      const isLinked = linkMap.has(shop.id)
      const request = requestMap.get(shop.id)

      let connection_status: string
      if (isLinked) {
        connection_status = "linked"
      } else if (request && request.status === "pending") {
        connection_status = "pending"
      } else {
        connection_status = "available"
      }

      return {
        id: shop.id,
        name: shop.shop_name,
        owner_name: shop.owner_name,
        phone: shop.phone,
        location: `${shop.city || ""}, ${shop.state || ""}`,
        connection_status,
        requested_rate: request?.commission_rate || null,
        request_id: request?.id || null,
      }
    }) || []

    return NextResponse.json({ shops: formatted })
  } catch (error) {
    console.error("GET shops error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}