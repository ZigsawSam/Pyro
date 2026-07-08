import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  try {
    const { shopId } = await params
    const supabase = await createClient()
    const shopIdNum = Number(shopId)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: requests, error } = await supabase
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
        agents:agent_id (
          name,
          phone_number,
          description,
          account_name,
          bank_name,
          upi_id
        )
      `)
      .eq("shop_id", shopIdNum)
      .eq("status", "pending")
      .order("requested_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const formatted = requests?.map((req: any) => ({
      ...req,
      agent_name: req.agents?.name,
      agent_phone: req.agents?.phone_number,
      agent_description: req.agents?.description,
      agent_account_name: req.agents?.account_name,
      agent_bank_name: req.agents?.bank_name,
      agent_upi_id: req.agents?.upi_id,
    })) || []

    return NextResponse.json({ requests: formatted })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  try {
    const { shopId } = await params
    const body = await request.json()
    const { request_id, action, commission_rate } = body
    const supabase = await createClient()
    const shopIdNum = Number(shopId)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    if (!request_id || !action) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    const { data: reqData, error: reqError } = await supabase
      .from("agent_link_requests")
      .select("*")
      .eq("id", Number(request_id))
      .eq("shop_id", shopIdNum)
      .single()

    if (reqError || !reqData) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    if (action === 'approve') {
      const rate = commission_rate !== undefined ? Number(commission_rate) : reqData.commission_rate

      const { error: linkError } = await supabase
        .from("shop_agent_links")
        .insert({
          shop_id: shopIdNum,
          agent_id: reqData.agent_id,
          commission_rate: rate,
          status: "active",
        })

      if (linkError) {
        if (linkError.message?.includes("duplicate") || linkError.code === "23505") {
          return NextResponse.json({ error: "Agent already linked" }, { status: 409 })
        }
        throw linkError
      }

      await supabase
        .from("agent_link_requests")
        .update({ status: "approved", responded_at: new Date().toISOString() })
        .eq("id", Number(request_id))

      return NextResponse.json({ message: "Agent approved and linked" })
    }

    if (action === 'reject') {
      await supabase
        .from("agent_link_requests")
        .update({ status: "rejected", responded_at: new Date().toISOString() })
        .eq("id", Number(request_id))

      return NextResponse.json({ message: "Request rejected" })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error: any) {
    if (error.message?.includes("duplicate") || error.code === "23505") {
      return NextResponse.json({ error: "Agent already linked" }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}