import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateAgentId } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const phone = searchParams.get("phone")
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    if (phone) {
      const { data: agents, error } = await supabase
        .from("agents")
        .select("id, unique_id, name, phone_number, description, account_name, account_number, bank_name, ifsc_code, upi_id")
        .eq("phone_number", phone)
        .eq("is_active", true)

      if (error) {
        console.error("Error fetching agents:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json(agents || [])
    }

    return NextResponse.json([])
  } catch (error) {
    console.error("Error fetching agents:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: agent, error } = await supabase
      .from("agents")
      .insert({
        unique_id: generateAgentId(),
        name: body.name,
        phone_number: body.phone_number,
        description: body.description || null,
        account_name: body.account_name || null,
        account_number: body.account_number || null,
        bank_name: body.bank_name || null,
        ifsc_code: body.ifsc_code || null,
        upi_id: body.upi_id || null,
        is_active: true,
        user_id: user.id,
      })
      .select("id, unique_id, name, phone_number, description")
      .single()

    if (error) {
      console.error("Error creating agent:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(agent, { status: 201 })
  } catch (error) {
    console.error("Error creating agent:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}