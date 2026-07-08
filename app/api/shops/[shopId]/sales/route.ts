import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  try {
    const { shopId } = await params
    const supabase = await createClient()
    const shopIdNum = Number(shopId)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: sales, error } = await supabase
      .from("sales")
      .select(`
        id,
        shop_id,
        agent_id,
        amount,
        commission_amount,
        sale_date,
        notes,
        created_at,
        agents:agent_id (
          name
        )
      `)
      .eq("shop_id", shopIdNum)
      .order("sale_date", { ascending: false })

    if (error) {
      console.error("Error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const formatted = sales?.map((s: any) => ({
      ...s,
      agent_name: s.agents?.name || "Unknown",
    })) || []

    return NextResponse.json({ sales: formatted })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  try {
    const { shopId } = await params
    const { agent_id, amount, notes } = await request.json()
    const supabase = await createClient()
    const shopIdNum = Number(shopId)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Get commission rate for this agent-shop pair
    const { data: link, error: linkError } = await supabase
      .from("shop_agent_links")
      .select("commission_rate")
      .eq("shop_id", shopIdNum)
      .eq("agent_id", agent_id)
      .single()

    if (linkError || !link) return NextResponse.json({ error: "Agent not found" }, { status: 400 })

    const commissionAmount = (Number(amount) * link.commission_rate) / 100

    const { data: sale, error: insertError } = await supabase
      .from("sales")
      .insert({
        shop_id: shopIdNum,
        agent_id: agent_id,
        amount: Number(amount),
        commission_amount: commissionAmount,
        sale_date: new Date().toISOString().split("T")[0],
        notes: notes || null,
      })
      .select()
      .single()

    if (insertError) {
      console.error("Error:", insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json(sale, { status: 201 })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}