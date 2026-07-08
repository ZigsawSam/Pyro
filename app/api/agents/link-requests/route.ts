import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { agent_id, shop_id, commission_rate, message } = body
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    if (!agent_id || !shop_id || commission_rate === undefined) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    // Check if already linked (active)
    const { data: existing, error: existingError } = await supabase
      .from("shop_agent_links")
      .select("id")
      .eq("shop_id", Number(shop_id))
      .eq("agent_id", Number(agent_id))
      .eq("status", "active")

    if (existingError) {
      console.error("Error checking existing link:", existingError)
      return NextResponse.json({ error: existingError.message }, { status: 500 })
    }

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: "Already linked to this shop" }, { status: 409 })
    }

    // Check if there's a PENDING request
    const { data: pending, error: pendingError } = await supabase
      .from("agent_link_requests")
      .select("id, status")
      .eq("shop_id", Number(shop_id))
      .eq("agent_id", Number(agent_id))
      .eq("status", "pending")

    if (pendingError) {
      console.error("Error checking pending request:", pendingError)
      return NextResponse.json({ error: pendingError.message }, { status: 500 })
    }

    if (pending && pending.length > 0) {
      return NextResponse.json({ error: "Already requested. Wait for response or cancel." }, { status: 409 })
    }

    const { data: result, error: insertError } = await supabase
      .from("agent_link_requests")
      .insert({
        shop_id: Number(shop_id),
        agent_id: Number(agent_id),
        commission_rate: Number(commission_rate),
        status: "pending",
        requested_by: "agent",
        message: message || null,
      })
      .select()
      .single()

    if (insertError) {
      console.error("POST link request error:", insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    console.error("POST link request error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}