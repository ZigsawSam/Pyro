import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ shopId: string; linkId: string }> },
) {
  try {
    const { shopId, linkId } = await params
    const body = await request.json()
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: linkResult, error: linkError } = await supabase
      .from("shop_agent_links")
      .select("agent_id")
      .eq("id", Number(linkId))
      .eq("shop_id", Number(shopId))
      .single()

    if (linkError || !linkResult) {
      return NextResponse.json({ error: "Agent link not found" }, { status: 404 })
    }

    const agentId = linkResult.agent_id

    const { error: agentError } = await supabase
      .from("agents")
      .update({
        name: body.name ?? null,
        phone_number: body.phone_number ?? null,
        description: body.description ?? null,
        account_name: body.account_name ?? null,
        account_number: body.account_number ?? null,
        bank_name: body.bank_name ?? null,
        ifsc_code: body.ifsc_code ?? null,
        upi_id: body.upi_id ?? null,
      })
      .eq("id", agentId)

    if (agentError) {
      console.error("Error updating agent:", agentError)
      return NextResponse.json({ error: agentError.message }, { status: 500 })
    }

    if (body.commission_rate !== undefined) {
      const { error: rateError } = await supabase
        .from("shop_agent_links")
        .update({ commission_rate: body.commission_rate })
        .eq("id", Number(linkId))
        .eq("shop_id", Number(shopId))

      if (rateError) {
        console.error("Error updating commission rate:", rateError)
        return NextResponse.json({ error: rateError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating agent:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ shopId: string; linkId: string }> },
) {
  try {
    const { shopId, linkId } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: linkResult, error: linkError } = await supabase
      .from("shop_agent_links")
      .select("agent_id")
      .eq("id", Number(linkId))
      .eq("shop_id", Number(shopId))
      .single()

    if (linkError || !linkResult) {
      return NextResponse.json({ error: "Agent link not found" }, { status: 404 })
    }

    const agentId = linkResult.agent_id

    const { data: remainingLinks, error: countError } = await supabase
      .from("shop_agent_links")
      .select("id")
      .eq("agent_id", agentId)

    if (countError) {
      console.error("Error counting links:", countError)
      return NextResponse.json({ error: countError.message }, { status: 500 })
    }

    const { error: deleteError } = await supabase
      .from("shop_agent_links")
      .delete()
      .eq("id", Number(linkId))
      .eq("shop_id", Number(shopId))

    if (deleteError) {
      console.error("Error removing agent link:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    if (remainingLinks && remainingLinks.length <= 1) {
      const { error: deactivateError } = await supabase
        .from("agents")
        .update({ is_active: false })
        .eq("id", agentId)

      if (deactivateError) {
        console.error("Error deactivating agent:", deactivateError)
        return NextResponse.json({ error: deactivateError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing agent:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}