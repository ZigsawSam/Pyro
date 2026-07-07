import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  try {
    const { shopId } = await params
    const sql = getDb()

    const payouts = await sql`
      SELECT p.*, COALESCE(a.name, s.name) as person_name, p.person_type
      FROM payouts p
      LEFT JOIN agents a ON p.agent_id = a.id
      LEFT JOIN staff s ON p.staff_id = s.id
      WHERE p.shop_id = ${Number(shopId)}
      ORDER BY p.payment_date DESC, p.id DESC
    `

    return NextResponse.json({ payouts })
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
    const sql = getDb()
    const shopIdNum = Number(shopId)
    const paymentAmount = Number(amount_paid)

    if (!person_id || amount_paid == null || amount_paid === "" || paymentAmount <= 0) {
      return NextResponse.json(
        { error: "Missing payout details", details: "person_id and amount_paid are required" },
        { status: 400 }
      )
    }

    if (person_type === "staff") {
      // Get staff pending amount
      const pendingResult = await sql`
        SELECT COALESCE(SUM(final_payable), 0) as pending
        FROM salary
        WHERE shop_id = ${shopIdNum} AND staff_id = ${person_id} AND status != 'paid'
      `
      const pendingAmount = Number(pendingResult[0]?.pending || 0)
      
      // Smart split: clear pending first, remainder goes to advance
      const clearingAmount = Math.min(paymentAmount, pendingAmount)
      const advanceAmount = paymentAmount - clearingAmount

      // Insert the payout record
      const payout = await sql`
        INSERT INTO payouts (shop_id, staff_id, agent_id, person_type, amount_paid, payment_date, remarks, is_advance)
        VALUES (${shopIdNum}, ${person_id}, NULL, 'staff', ${paymentAmount}, CURRENT_DATE, ${remarks || null}, ${advanceAmount > 0 ? 1 : 0})
        RETURNING *
      `

      // Deduct from salary if there's pending to clear
      if (clearingAmount > 0) {
        await sql`
          UPDATE salary
          SET final_payable = MAX(final_payable - ${clearingAmount}, 0),
              status = CASE WHEN final_payable - ${clearingAmount} <= 0 THEN 'paid' ELSE 'pending' END
          WHERE shop_id = ${shopIdNum} AND staff_id = ${person_id} AND status != 'paid'
          ORDER BY month DESC
          LIMIT 1
        `
      }

      return NextResponse.json({
        ...payout[0],
        clearing_amount: clearingAmount,
        advance_amount: advanceAmount,
      }, { status: 201 })
    }

    // Agent payout — smart split (FIXED: subtract advances from pending)
    const commissionResult = await sql`
      SELECT COALESCE(SUM(commission_amount), 0) as total_commission
      FROM sales
      WHERE shop_id = ${shopIdNum} AND agent_id = ${person_id}
    `
    const paidResult = await sql`
      SELECT COALESCE(SUM(amount_paid), 0) as total_paid
      FROM payouts
      WHERE shop_id = ${shopIdNum} AND agent_id = ${person_id} AND person_type = 'agent' AND is_advance = 0
    `
    const advanceResult = await sql`
      SELECT COALESCE(SUM(amount_paid), 0) as total_advance
      FROM payouts
      WHERE shop_id = ${shopIdNum} AND agent_id = ${person_id} AND person_type = 'agent' AND is_advance = 1
    `
    
    const totalCommission = Number(commissionResult[0]?.total_commission || 0)
    const totalPaid = Number(paidResult[0]?.total_paid || 0)
    const totalAdvance = Number(advanceResult[0]?.total_advance || 0)
    const pendingAmount = Math.max(totalCommission - totalPaid - totalAdvance, 0)
    
    const clearingAmount = Math.min(paymentAmount, pendingAmount)
    const advanceAmount = paymentAmount - clearingAmount

    const payout = await sql`
      INSERT INTO payouts (shop_id, staff_id, agent_id, person_type, amount_paid, payment_date, remarks, is_advance)
      VALUES (${shopIdNum}, NULL, ${person_id}, 'agent', ${paymentAmount}, CURRENT_DATE, ${remarks || null}, ${advanceAmount > 0 ? 1 : 0})
      RETURNING *
    `

    return NextResponse.json({
      ...payout[0],
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