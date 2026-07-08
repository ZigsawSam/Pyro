import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET: Agent sees invitations sent TO them by shops
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get("agentId")
    if (!agentId) return NextResponse.json({ error: "agentId required" }, { status: 400 })

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: invitations, error } = await supabase
      .from("agent_link_requests")
      .select(`
        id,
        shop_id,
        agent_id,
        commission_rate,
        status,
        requested_by,
        message,
        requested_at,
        responded_at,
        shops:shop_id (
          shop_name,
          city,
          state,
          phone
        )
      `)
      .eq("agent_id", Number(agentId))
      .eq("status", "pending")
      .eq("requested_by", "shop")
      .order("requested_at", { ascending: false })

    if (error) {
      console.error("GET invitations error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const formatted = invitations?.map((inv: any) => ({
      ...inv,
      shop_name: inv.shops?.shop_name,
      shop_location: `${inv.shops?.city || ""}, ${inv.shops?.state || ""}`,
      shop_phone: inv.shops?.phone,
    })) || []

    return NextResponse.json({ invitations: formatted })
  } catch (error) {
    console.error("GET invitations error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// PUT: Agent accepts or rejects an invitation
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { request_id, action } = body
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    if (!request_id || !action) {
      return NextResponse.json({ error: "request_id and action required" }, { status: 400 })
    }

    const { data: reqData, error: reqError } = await supabase
      .from("agent_link_requests")
      .select("*")
      .eq("id", Number(request_id))
      .eq("status", "pending")
      .single()

    if (reqError || !reqData) {
      return NextResponse.json({ error: "Request not found or already processed" }, { status: 404 })
    }

    const { shop_id, agent_id, commission_rate } = reqData

    if (action === 'accept') {
      const { error: linkError } = await supabase
        .from("shop_agent_links")
        .insert({
          shop_id,
          agent_id,
          commission_rate,
          status: "active",
        })

      if (linkError) {
        if (linkError.message?.includes("duplicate") || linkError.code === "23505") {
          return NextResponse.json({ error: "Already linked to this shop" }, { status: 409 })
        }
        throw linkError
      }

      await supabase
        .from("agent_link_requests")
        .update({ status: "approved", responded_at: new Date().toISOString() })
        .eq("id", Number(request_id))

      return NextResponse.json({ message: "Invitation accepted. You are now linked to the shop." })
    }

    if (action === 'reject') {
      await supabase
        .from("agent_link_requests")
        .update({ status: "rejected", responded_at: new Date().toISOString() })
        .eq("id", Number(request_id))

      return NextResponse.json({ message: "Invitation rejected." })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error: any) {
    console.error("PUT invitation error:", error)
    if (error.message?.includes("duplicate") || error.code === "23505") {
      return NextResponse.json({ error: "Already linked to this shop" }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}