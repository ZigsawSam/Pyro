import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  try {
    const { shopId } = await params
    const supabase = await createClient()
    const shopIdNum = Number(shopId)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: payouts, error } = await supabase
      .from("payouts")
      .select(`
        id,
        shop_id,
        staff_id,
        agent_id,
        person_type,
        amount_paid,
        payment_date,
        remarks,
        is_advance,
        created_at,
        agents:agent_id (
          name
        ),
        staff:staff_id (
          name
        )
      `)
      .eq("shop_id", shopIdNum)
      .order("payment_date", { ascending: false })

    if (error) {
      const message = error.message
      console.error("GET Error:", message)
      return NextResponse.json(
        { error: "Internal server error", details: message },
        { status: 500 }
      )
    }

    const formatted = payouts?.map((p: any) => ({
      ...p,
      person_name: p.agents?.name || p.staff?.name || "Unknown",
    })) || []

    return NextResponse.json({ payouts: formatted })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("GET Error:", message)
    return NextResponse.json(
      { error: "Internal server error", details: message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  try {
    const { shopId } = await params
    const payload = await request.json()
    const { person_type, person_id, amount_paid, remarks } = payload
    const supabase = await createClient()
    const shopIdNum = Number(shopId)
    const paymentAmount = Number(amount_paid)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    if (!person_id || amount_paid == null || amount_paid === "" || paymentAmount <= 0) {
      return NextResponse.json(
        { error: "Missing payout details", details: "person_id and amount_paid are required" },
        { status: 400 }
      )
    }

    if (person_type === "staff") {
      // Get staff pending amount
      const { data: pendingResult, error: pendingError } = await supabase
        .from("salary")
        .select("final_payable")
        .eq("shop_id", shopIdNum)
        .eq("staff_id", person_id)
        .neq("status", "paid")

      if (pendingError) {
        const message = pendingError.message
        console.error("POST Error:", message)
        return NextResponse.json(
          { error: "Internal server error", details: message },
          { status: 500 }
        )
      }

      const pendingAmount = pendingResult?.reduce((sum: number, s: any) => sum + (s.final_payable || 0), 0) || 0

      // Smart split: clear pending first, remainder goes to advance
      const clearingAmount = Math.min(paymentAmount, pendingAmount)
      const advanceAmount = paymentAmount - clearingAmount

      // Insert the payout record
      const { data: payout, error: payoutError } = await supabase
        .from("payouts")
        .insert({
          shop_id: shopIdNum,
          staff_id: person_id,
          agent_id: null,
          person_type: "staff",
          amount_paid: paymentAmount,
          payment_date: new Date().toISOString().split("T")[0],
          remarks: remarks || null,
          is_advance: advanceAmount > 0,
        })
        .select()
        .single()

      if (payoutError) {
        const message = payoutError.message
        console.error("POST Error:", message)
        return NextResponse.json(
          { error: "Internal server error", details: message },
          { status: 500 }
        )
      }

      // Deduct from salary if there's pending to clear
      if (clearingAmount > 0) {
        const { data: salaryRecords, error: salaryError } = await supabase
          .from("salary")
          .select("id, final_payable")
          .eq("shop_id", shopIdNum)
          .eq("staff_id", person_id)
          .neq("status", "paid")
          .order("month", { ascending: false })

        if (salaryError) {
          const message = salaryError.message
          console.error("POST Error:", message)
          return NextResponse.json(
            { error: "Internal server error", details: message },
            { status: 500 }
          )
        }

        let remaining = clearingAmount
        for (const record of (salaryRecords || [])) {
          if (remaining <= 0) break
          const deduct = Math.min(remaining, record.final_payable)
          const newPayable = record.final_payable - deduct
          remaining -= deduct

          const { error: updateError } = await supabase
            .from("salary")
            .update({
              final_payable: newPayable,
              status: newPayable <= 0 ? "paid" : "pending",
            })
            .eq("id", record.id)

          if (updateError) {
            const message = updateError.message
            console.error("POST Error:", message)
            return NextResponse.json(
              { error: "Internal server error", details: message },
              { status: 500 }
            )
          }
        }
      }

      return NextResponse.json({
        ...payout,
        clearing_amount: clearingAmount,
        advance_amount: advanceAmount,
      }, { status: 201 })
    }

    // Agent payout — smart split
    const { data: commissionResult, error: commissionError } = await supabase
      .from("sales")
      .select("commission_amount")
      .eq("shop_id", shopIdNum)
      .eq("agent_id", person_id)

    if (commissionError) {
      const message = commissionError.message
      console.error("POST Error:", message)
      return NextResponse.json(
        { error: "Internal server error", details: message },
        { status: 500 }
      )
    }

    const { data: paidResult, error: paidError } = await supabase
      .from("payouts")
      .select("amount_paid")
      .eq("shop_id", shopIdNum)
      .eq("agent_id", person_id)
      .eq("person_type", "agent")
      .eq("is_advance", false)

    if (paidError) {
      const message = paidError.message
      console.error("POST Error:", message)
      return NextResponse.json(
        { error: "Internal server error", details: message },
        { status: 500 }
      )
    }

    const { data: advanceResult, error: advanceError } = await supabase
      .from("payouts")
      .select("amount_paid")
      .eq("shop_id", shopIdNum)
      .eq("agent_id", person_id)
      .eq("person_type", "agent")
      .eq("is_advance", true)

    if (advanceError) {
      const message = advanceError.message
      console.error("POST Error:", message)
      return NextResponse.json(
        { error: "Internal server error", details: message },
        { status: 500 }
      )
    }

    const totalCommission = commissionResult?.reduce((sum: number, s: any) => sum + (s.commission_amount || 0), 0) || 0
    const totalPaid = paidResult?.reduce((sum: number, p: any) => sum + (p.amount_paid || 0), 0) || 0
    const totalAdvance = advanceResult?.reduce((sum: number, p: any) => sum + (p.amount_paid || 0), 0) || 0
    const pendingAmount = Math.max(totalCommission - totalPaid - totalAdvance, 0)

    const clearingAmount = Math.min(paymentAmount, pendingAmount)
    const advanceAmount = paymentAmount - clearingAmount

    const { data: payout, error: payoutError } = await supabase
      .from("payouts")
      .insert({
        shop_id: shopIdNum,
        staff_id: null,
        agent_id: person_id,
        person_type: "agent",
        amount_paid: paymentAmount,
        payment_date: new Date().toISOString().split("T")[0],
        remarks: remarks || null,
        is_advance: advanceAmount > 0,
      })
      .select()
      .single()

    if (payoutError) {
      const message = payoutError.message
      console.error("POST Error:", message)
      return NextResponse.json(
        { error: "Internal server error", details: message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ...payout,
      clearing_amount: clearingAmount,
      advance_amount: advanceAmount,
    }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("POST Error:", message)
    return NextResponse.json(
      { error: "Internal server error", details: message },
      { status: 500 }
    )
  }
}