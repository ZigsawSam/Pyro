import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateAgentId } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  try {
    const { shopId } = await params
    const supabase = await createClient()
    const shopIdNum = Number(shopId)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Get active agent links for this shop
    const { data: links, error: linksError } = await supabase
      .from("shop_agent_links")
      .select("id, agent_id, commission_rate")
      .eq("shop_id", shopIdNum)
      .eq("status", "active")

    if (linksError) {
      const message = linksError.message
      console.error("Error fetching agents:", message)
      return NextResponse.json({ error: "Internal server error", details: message }, { status: 500 })
    }

    if (!links || links.length === 0) {
      return NextResponse.json({ agents: [] })
    }

    const agentIds = links.map((l: any) => l.agent_id)

    // Get agent details
    const { data: agentsData, error: agentsError } = await supabase
      .from("agents")
      .select("id, name, phone_number, description, account_name, account_number, bank_name, ifsc_code, upi_id")
      .in("id", agentIds)

    if (agentsError) {
      const message = agentsError.message
      console.error("Error fetching agents:", message)
      return NextResponse.json({ error: "Internal server error", details: message }, { status: 500 })
    }

    // Get sales totals per agent
    const { data: salesData, error: salesError } = await supabase
      .from("sales")
      .select("agent_id, amount, commission_amount")
      .eq("shop_id", shopIdNum)
      .in("agent_id", agentIds)

    if (salesError) {
      const message = salesError.message
      console.error("Error fetching agents:", message)
      return NextResponse.json({ error: "Internal server error", details: message }, { status: 500 })
    }

    // Get regular payouts per agent
    const { data: payoutsData, error: payoutsError } = await supabase
      .from("payouts")
      .select("agent_id, amount_paid")
      .eq("shop_id", shopIdNum)
      .eq("person_type", "agent")
      .eq("is_advance", false)
      .in("agent_id", agentIds)

    if (payoutsError) {
      const message = payoutsError.message
      console.error("Error fetching agents:", message)
      return NextResponse.json({ error: "Internal server error", details: message }, { status: 500 })
    }

    // Get advance payouts per agent
    const { data: advanceData, error: advanceError } = await supabase
      .from("payouts")
      .select("agent_id, amount_paid")
      .eq("shop_id", shopIdNum)
      .eq("person_type", "agent")
      .eq("is_advance", true)
      .in("agent_id", agentIds)

    if (advanceError) {
      const message = advanceError.message
      console.error("Error fetching agents:", message)
      return NextResponse.json({ error: "Internal server error", details: message }, { status: 500 })
    }

    // Build maps
    const linkMap = new Map(links.map((l: any) => [l.agent_id, l]))
    const salesMap = new Map<number, { total_sales: number; total_commission: number }>()
    const payoutsMap = new Map<number, number>()
    const advanceMap = new Map<number, number>()

    salesData?.forEach((sale: any) => {
      const existing = salesMap.get(sale.agent_id) || { total_sales: 0, total_commission: 0 }
      existing.total_sales += sale.amount || 0
      existing.total_commission += sale.commission_amount || 0
      salesMap.set(sale.agent_id, existing)
    })

    payoutsData?.forEach((payout: any) => {
      payoutsMap.set(payout.agent_id, (payoutsMap.get(payout.agent_id) || 0) + (payout.amount_paid || 0))
    })

    advanceData?.forEach((advance: any) => {
      advanceMap.set(advance.agent_id, (advanceMap.get(advance.agent_id) || 0) + (advance.amount_paid || 0))
    })

    // Build result
    const agents = (agentsData || [])
      .map((agent: any) => {
        const link = linkMap.get(agent.id)
        const sales = salesMap.get(agent.id) || { total_sales: 0, total_commission: 0 }
        const paid = payoutsMap.get(agent.id) || 0
        const advance = advanceMap.get(agent.id) || 0
        const pending = Math.max(0, sales.total_commission - paid - advance)

        return {
          link_id: link?.id,
          id: agent.id,
          name: agent.name,
          phone_number: agent.phone_number,
          description: agent.description,
          account_name: agent.account_name,
          account_number: agent.account_number,
          bank_name: agent.bank_name,
          ifsc_code: agent.ifsc_code,
          upi_id: agent.upi_id,
          commission_rate: link?.commission_rate,
          total_sales: sales.total_sales,
          total_commission: sales.total_commission,
          paid_commission: paid,
          total_advance: advance,
          pending_commission: pending,
        }
      })
      .sort((a: any, b: any) => a.name.localeCompare(b.name))

    return NextResponse.json({ agents })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("Error fetching agents:", message)
    return NextResponse.json({ error: "Internal server error", details: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  try {
    const { shopId } = await params
    const body = await request.json()
    const { name, phone_number, commission_rate, description, account_name, account_number, bank_name, ifsc_code, upi_id } = body
    const supabase = await createClient()
    const shopIdNum = Number(shopId)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    if (!name || !phone_number || commission_rate === undefined) {
      return NextResponse.json({ error: "Name, phone and commission rate required" }, { status: 400 })
    }

    // Check if agent already exists by phone
    const { data: existingAgent, error: existingError } = await supabase
      .from("agents")
      .select("id")
      .eq("phone_number", phone_number)
      .single()

    let agentId: number

    if (existingError && existingError.code === "PGRST116") {
      // Agent not found, create new
      const { data: newAgent, error: createError } = await supabase
        .from("agents")
        .insert({
          unique_id: generateAgentId(),
          name: name,
          phone_number: phone_number,
          description: description || null,
          account_name: account_name || null,
          account_number: account_number || null,
          bank_name: bank_name || null,
          ifsc_code: ifsc_code || null,
          upi_id: upi_id || null,
          is_active: true,
        })
        .select("id")
        .single()

      if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 500 })
      }

      agentId = newAgent.id
    } else if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 })
    } else {
      agentId = existingAgent.id
      const { error: updateError } = await supabase
        .from("agents")
        .update({
          name: name,
          description: description || null,
          account_name: account_name || null,
          account_number: account_number || null,
          bank_name: bank_name || null,
          ifsc_code: ifsc_code || null,
          upi_id: upi_id || null,
        })
        .eq("id", agentId)

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
    }

    // Check if already linked to this shop
    const { data: existingLink, error: linkError } = await supabase
      .from("shop_agent_links")
      .select("id")
      .eq("shop_id", shopIdNum)
      .eq("agent_id", agentId)

    if (linkError) {
      return NextResponse.json({ error: linkError.message }, { status: 500 })
    }

    if (existingLink && existingLink.length > 0) {
      return NextResponse.json({ error: "Agent already linked to this shop" }, { status: 409 })
    }

    // Check if there's a pending request
    const { data: pending, error: pendingError } = await supabase
      .from("agent_link_requests")
      .select("id")
      .eq("shop_id", shopIdNum)
      .eq("agent_id", agentId)
      .eq("status", "pending")

    if (pendingError) {
      return NextResponse.json({ error: pendingError.message }, { status: 500 })
    }

    if (pending && pending.length > 0) {
      return NextResponse.json({ error: "There's a pending request with this agent. Resolve it first." }, { status: 409 })
    }

    // Create link directly
    const { data: link, error: insertError } = await supabase
      .from("shop_agent_links")
      .insert({
        shop_id: shopIdNum,
        agent_id: agentId,
        commission_rate: Number(commission_rate),
        status: "active",
      })
      .select()
      .single()

    if (insertError) {
      if (insertError.message?.includes("duplicate") || insertError.code === "23505") {
        return NextResponse.json({ error: "Agent already linked" }, { status: 409 })
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      message: "Agent linked successfully",
      link: link,
      agent_id: agentId,
    }, { status: 201 })
  } catch (error: any) {
    if (error.message?.includes("duplicate") || error.code === "23505") {
      return NextResponse.json({ error: "Agent already linked" }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}