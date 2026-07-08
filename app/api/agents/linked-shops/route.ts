import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get("agentId")
    if (!agentId) return NextResponse.json({ error: "agentId required" }, { status: 400 })

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const agentIdNum = Number(agentId)

    // Get active shop links
    const { data: links, error: linksError } = await supabase
      .from("shop_agent_links")
      .select("shop_id, commission_rate")
      .eq("agent_id", agentIdNum)
      .eq("status", "active")

    if (linksError) {
      console.error("GET linked shops error:", linksError)
      return NextResponse.json({ error: linksError.message }, { status: 500 })
    }

    if (!links || links.length === 0) {
      return NextResponse.json({ shops: [] })
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

    // Get sales totals
    const { data: salesData, error: salesError } = await supabase
      .from("sales")
      .select("shop_id, amount, commission_amount")
      .eq("agent_id", agentIdNum)
      .in("shop_id", shopIds)

    if (salesError) {
      console.error("Error fetching sales:", salesError)
      return NextResponse.json({ error: salesError.message }, { status: 500 })
    }

    // Get regular payouts
    const { data: payoutsData, error: payoutsError } = await supabase
      .from("payouts")
      .select("shop_id, amount_paid")
      .eq("agent_id", agentIdNum)
      .eq("person_type", "agent")
      .eq("is_advance", false)
      .in("shop_id", shopIds)

    if (payoutsError) {
      console.error("Error fetching payouts:", payoutsError)
      return NextResponse.json({ error: payoutsError.message }, { status: 500 })
    }

    // Get advance payouts
    const { data: advanceData, error: advanceError } = await supabase
      .from("payouts")
      .select("shop_id, amount_paid")
      .eq("agent_id", agentIdNum)
      .eq("person_type", "agent")
      .eq("is_advance", true)
      .in("shop_id", shopIds)

    if (advanceError) {
      console.error("Error fetching advances:", advanceError)
      return NextResponse.json({ error: advanceError.message }, { status: 500 })
    }

    // Build maps
    const shopMap = new Map(shopsData?.map((s: any) => [s.id, s.shop_name]) || [])

    const salesMap = new Map<number, { total_sales: number; total_commission: number }>()
    salesData?.forEach((sale: any) => {
      const existing = salesMap.get(sale.shop_id) || { total_sales: 0, total_commission: 0 }
      existing.total_sales += sale.amount || 0
      existing.total_commission += sale.commission_amount || 0
      salesMap.set(sale.shop_id, existing)
    })

    const payoutsMap = new Map<number, number>()
    payoutsData?.forEach((p: any) => {
      payoutsMap.set(p.shop_id, (payoutsMap.get(p.shop_id) || 0) + (p.amount_paid || 0))
    })

    const advanceMap = new Map<number, number>()
    advanceData?.forEach((p: any) => {
      advanceMap.set(p.shop_id, (advanceMap.get(p.shop_id) || 0) + (p.amount_paid || 0))
    })

    // Build result
    const shops = links.map((link: any) => {
      const sales = salesMap.get(link.shop_id) || { total_sales: 0, total_commission: 0 }
      const paid = payoutsMap.get(link.shop_id) || 0
      const advance = advanceMap.get(link.shop_id) || 0
      const pending = Math.max(0, sales.total_commission - paid - advance)

      return {
        shop_id: link.shop_id,
        shop_name: shopMap.get(link.shop_id) || "Unknown",
        commission_rate: link.commission_rate,
        total_sales: sales.total_sales,
        total_commission: sales.total_commission,
        pending_commission: pending,
      }
    })

    shops.sort((a: any, b: any) => a.shop_name.localeCompare(b.shop_name))

    return NextResponse.json({ shops })
  } catch (error) {
    console.error("GET linked shops error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}