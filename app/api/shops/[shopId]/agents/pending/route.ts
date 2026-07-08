import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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
      .select("agent_id")
      .eq("shop_id", shopIdNum)
      .eq("status", "active")

    if (linksError) {
      const message = linksError.message
      console.error("Error:", message)
      return NextResponse.json({ error: "Internal server error", details: message }, { status: 500 })
    }

    if (!links || links.length === 0) {
      return NextResponse.json({ agents: [] })
    }

    const agentIds = links.map((l: any) => l.agent_id)

    // Get agent names
    const { data: agentsData, error: agentsError } = await supabase
      .from("agents")
      .select("id, name")
      .in("id", agentIds)

    if (agentsError) {
      const message = agentsError.message
      console.error("Error:", message)
      return NextResponse.json({ error: "Internal server error", details: message }, { status: 500 })
    }

    // Get sales commissions per agent
    const { data: salesData, error: salesError } = await supabase
      .from("sales")
      .select("agent_id, commission_amount")
      .eq("shop_id", shopIdNum)
      .in("agent_id", agentIds)

    if (salesError) {
      const message = salesError.message
      console.error("Error:", message)
      return NextResponse.json({ error: "Internal server error", details: message }, { status: 500 })
    }

    // Get payouts per agent
    const { data: payoutsData, error: payoutsError } = await supabase
      .from("payouts")
      .select("agent_id, amount_paid")
      .eq("shop_id", shopIdNum)
      .eq("person_type", "agent")
      .in("agent_id", agentIds)

    if (payoutsError) {
      const message = payoutsError.message
      console.error("Error:", message)
      return NextResponse.json({ error: "Internal server error", details: message }, { status: 500 })
    }

    // Calculate totals per agent
    const salesMap = new Map<number, number>()
    salesData?.forEach((sale: any) => {
      salesMap.set(sale.agent_id, (salesMap.get(sale.agent_id) || 0) + (sale.commission_amount || 0))
    })

    const payoutsMap = new Map<number, number>()
    payoutsData?.forEach((payout: any) => {
      payoutsMap.set(payout.agent_id, (payoutsMap.get(payout.agent_id) || 0) + (payout.amount_paid || 0))
    })

    // Build result with only positive pending
    const agents = (agentsData || [])
      .map((agent: any) => {
        const totalCommission = salesMap.get(agent.id) || 0
        const totalPaid = payoutsMap.get(agent.id) || 0
        const pendingCommission = totalCommission - totalPaid

        return {
          id: agent.id,
          name: agent.name,
          pending_commission: pendingCommission,
        }
      })
      .filter((agent: any) => agent.pending_commission > 0)
      .sort((a: any, b: any) => a.name.localeCompare(b.name))

    return NextResponse.json({ agents })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("Error:", message)
    return NextResponse.json({ error: "Internal server error", details: message }, { status: 500 })
  }
}