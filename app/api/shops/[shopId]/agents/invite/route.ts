import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateAgentId } from "@/lib/auth"

export async function POST(request: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  try {
    const { shopId } = await params
    const body = await request.json()
    const { phone_number, commission_rate, message } = body
    const supabase = await createClient()
    const shopIdNum = Number(shopId)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    if (!phone_number || commission_rate === undefined) {
      return NextResponse.json({ error: "Phone and commission rate required" }, { status: 400 })
    }

    // Find agent by phone
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("id, name, phone_number, description, account_name, bank_name, upi_id")
      .eq("phone_number", phone_number)
      .single()

    let agentId: number
    let isNewAgent = false

    if (agentError && agentError.code === "PGRST116") {
      // Agent not found, create new
      const { data: newAgent, error: createError } = await supabase
        .from("agents")
        .insert({
          unique_id: generateAgentId(),
          name: phone_number,
          phone_number: phone_number,
          is_active: true,
        })
        .select("id")
        .single()

      if (createError) {
        console.error("Invite error creating agent:", createError)
        return NextResponse.json({ error: createError.message }, { status: 500 })
      }

      agentId = newAgent.id
      isNewAgent = true
    } else if (agentError) {
      return NextResponse.json({ error: agentError.message }, { status: 500 })
    } else {
      agentId = agent.id
    }

    // Check if already linked (active)
    const { data: existing, error: existingError } = await supabase
      .from("shop_agent_links")
      .select("id")
      .eq("shop_id", shopIdNum)
      .eq("agent_id", agentId)
      .eq("status", "active")

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 })
    }

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: "Already linked to this shop" }, { status: 409 })
    }

    // Check if there's a PENDING request
    const { data: pending, error: pendingError } = await supabase
      .from("agent_link_requests")
      .select("id, status")
      .eq("shop_id", shopIdNum)
      .eq("agent_id", agentId)
      .eq("status", "pending")

    if (pendingError) {
      return NextResponse.json({ error: pendingError.message }, { status: 500 })
    }

    if (pending && pending.length > 0) {
      return NextResponse.json({ error: "Request already pending" }, { status: 409 })
    }

    const { data: result, error: insertError } = await supabase
      .from("agent_link_requests")
      .insert({
        shop_id: shopIdNum,
        agent_id: agentId,
        commission_rate: Number(commission_rate),
        status: "pending",
        requested_by: "shop",
        message: message || null,
      })
      .select()
      .single()

    if (insertError) {
      console.error("Invite error:", insertError)
      if (insertError.message?.includes("duplicate") || insertError.code === "23505") {
        return NextResponse.json({ error: "Request already exists or was previously made" }, { status: 409 })
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      message: isNewAgent
        ? "Invitation sent. Agent account created."
        : "Invitation sent to existing agent.",
      request: result,
      agent_id: agentId,
      is_new_agent: isNewAgent,
    }, { status: 201 })
  } catch (error: any) {
    console.error("Invite error:", error)
    if (error.message?.includes("duplicate") || error.code === "23505") {
      return NextResponse.json({ error: "Request already exists or was previously made" }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}