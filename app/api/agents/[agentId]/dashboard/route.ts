import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  try {
    const { agentId } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Get all active shop links for this agent
    const { data: links, error: linksError } = await supabase
      .from("shop_agent_links")
      .select("shop_id, commission_rate")
      .eq("agent_id", Number(agentId))
      .eq("status", "active")

    if (linksError) {
      console.error("Error fetching shop links:", linksError)
      return NextResponse.json({ error: linksError.message }, { status: 500 })
    }

    if (!links || links.length === 0) {
      return NextResponse.json({ shops: [], totals: { total_sales: 0, total_commission: 0, paid_commission: 0, pending_commission: 0 } })
    }

    const shopIds = links.map((l: any) => l.shop_id)

    // Get shop names
    const { data: shopsData, error: shopsError } = await supabase
      .from("shops")
      .select("id, shop_name")
      .in("id", shopIds)

    if (shopsError) {
      console.error("Error fetching shops:", shopsError)
      return NextResponse.json({ error: shopsError.message }, { status: 500 })
    }

    // Get sales totals per shop
    const { data: salesData, error: salesError } = await supabase
      .from("sales")
      .select("shop_id, amount, commission_amount")
      .eq("agent_id", Number(agentId))
      .in("shop_id", shopIds)

    if (salesError) {
      console.error("Error fetching sales:", salesError)
      return NextResponse.json({ error: salesError.message }, { status: 500 })
    }

    // Get payouts totals per shop
    const { data: payoutsData, error: payoutsError } = await supabase
      .from("payouts")
      .select("shop_id, amount_paid")
      .eq("agent_id", Number(agentId))
      .in("shop_id", shopIds)

    if (payoutsError) {
      console.error("Error fetching payouts:", payoutsError)
      return NextResponse.json({ error: payoutsError.message }, { status: 500 })
    }

    // Build result
    const shopMap = new Map(shopsData?.map((s: any) => [s.id, s.shop_name]) || [])
    const salesMap = new Map<number, { total_sales: number; total_commission: number }>()
    const payoutsMap = new Map<number, number>()

    salesData?.forEach((sale: any) => {
      const existing = salesMap.get(sale.shop_id) || { total_sales: 0, total_commission: 0 }
      existing.total_sales += sale.amount || 0
      existing.total_commission += sale.commission_amount || 0
      salesMap.set(sale.shop_id, existing)
    })

    payoutsData?.forEach((payout: any) => {
      const existing = payoutsMap.get(payout.shop_id) || 0
      payoutsMap.set(payout.shop_id, existing + (payout.amount_paid || 0))
    })

    const shops = links.map((link: any) => {
      const sales = salesMap.get(link.shop_id) || { total_sales: 0, total_commission: 0 }
      const paid = payoutsMap.get(link.shop_id) || 0

      return {
        shop_id: link.shop_id,
        shop_name: shopMap.get(link.shop_id) || "Unknown",
        commission_rate: link.commission_rate,
        total_sales: sales.total_sales,
        total_commission: sales.total_commission,
        paid_commission: paid,
        pending_commission: sales.total_commission - paid,
      }
    })

    shops.sort((a: any, b: any) => a.shop_name.localeCompare(b.shop_name))

    const totals = {
      total_sales: shops.reduce((sum: number, s: any) => sum + s.total_sales, 0),
      total_commission: shops.reduce((sum: number, s: any) => sum + s.total_commission, 0),
      paid_commission: shops.reduce((sum: number, s: any) => sum + s.paid_commission, 0),
      pending_commission: shops.reduce((sum: number, s: any) => sum + s.pending_commission, 0),
    }

    return NextResponse.json({ shops, totals })
  } catch (error) {
    console.error("Error fetching agent dashboard:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}