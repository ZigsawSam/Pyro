import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  try {
    const { agentId } = await params
    const searchParams = request.nextUrl.searchParams
    const shopId = searchParams.get("shop_id")

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Get shop name
    const { data: shopResult, error: shopError } = await supabase
      .from("shops")
      .select("shop_name")
      .eq("id", Number(shopId))
      .single()

    if (shopError) {
      console.error("Error fetching shop:", shopError)
      return NextResponse.json({ error: shopError.message }, { status: 500 })
    }

    const shopName = shopResult?.shop_name || "Unknown Shop"

    // Get all commissions for agent in this shop
    const { data: sales, error: salesError } = await supabase
      .from("sales")
      .select("id, amount, commission_amount, sale_date")
      .eq("agent_id", Number(agentId))
      .eq("shop_id", Number(shopId))
      .order("sale_date", { ascending: false })

    if (salesError) {
      console.error("Error fetching commissions:", salesError)
      return NextResponse.json({ error: salesError.message }, { status: 500 })
    }

    // Check if payouts exist for each sale
    const { data: payouts, error: payoutsError } = await supabase
      .from("payouts")
      .select("shop_id, agent_id")
      .eq("agent_id", Number(agentId))
      .eq("shop_id", Number(shopId))

    if (payoutsError) {
      console.error("Error fetching payouts:", payoutsError)
      return NextResponse.json({ error: payoutsError.message }, { status: 500 })
    }

    const hasPayouts = payouts && payouts.length > 0

    const commissions = sales?.map((sale: any) => ({
      sale_id: sale.id,
      amount: sale.amount,
      commission_amount: sale.commission_amount,
      sale_date: sale.sale_date,
      paid: hasPayouts,
    })) || []

    return NextResponse.json({ commissions, shop_name: shopName })
  } catch (error) {
    console.error("Error fetching commissions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}