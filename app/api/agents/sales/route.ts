import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get("agentId")
    const shopId = searchParams.get("shopId")
    const from = searchParams.get("from")
    const to = searchParams.get("to")
    
    if (!agentId) return NextResponse.json({ error: "agentId required" }, { status: 400 })

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const agentIdNum = Number(agentId)

    // Build query
    let query = supabase
      .from("sales")
      .select(`
        id,
        shop_id,
        amount,
        commission_amount,
        sale_date,
        notes,
        shops:shop_id (
          shop_name
        )
      `)
      .eq("agent_id", agentIdNum)
      .order("sale_date", { ascending: false })

    if (shopId) {
      query = query.eq("shop_id", Number(shopId))
    }

    if (from) {
      query = query.gte("sale_date", from)
    }

    if (to) {
      query = query.lte("sale_date", to)
    }

    const { data: sales, error } = await query

    if (error) {
      console.error("GET sales error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const formatted = sales?.map((sale: any) => ({
      id: sale.id,
      shop_id: sale.shop_id,
      shop_name: sale.shops?.shop_name || "Unknown",
      amount: sale.amount,
      commission_amount: sale.commission_amount,
      sale_date: sale.sale_date,
      notes: sale.notes,
    })) || []

    return NextResponse.json({ sales: formatted })
  } catch (error) {
    console.error("GET sales error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}