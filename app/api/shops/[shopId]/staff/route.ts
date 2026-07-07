import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  try {
    const { shopId } = await params
    const sql = getDb()

    const staff = await sql`
      SELECT
        st.*, 
        COALESCE(pending_agg.pending_payroll, 0) as pending_payroll,
        COALESCE(paid_agg.paid_payroll, 0) as paid_payroll,
        COALESCE(advance_agg.total_advance, 0) as total_advance,
        COALESCE(today_att.present_days, 0) as today_present_days,
        COALESCE(today_att.work_hours, 0) as today_work_hours,
        CASE
          WHEN st.salary_type = 'hourly' THEN COALESCE(today_att.work_hours, 0) * st.base_salary
          WHEN st.salary_type = 'daily' THEN COALESCE(today_att.present_days, 0) * st.base_salary
          ELSE COALESCE(today_att.present_days, 0) * (st.base_salary / 30.0)
        END as today_due
      FROM staff st
      LEFT JOIN (
        SELECT staff_id, SUM(final_payable) as pending_payroll
        FROM salary
        WHERE shop_id = ${Number(shopId)} AND status != 'paid'
        GROUP BY staff_id
      ) pending_agg ON pending_agg.staff_id = st.id
      LEFT JOIN (
        SELECT staff_id, SUM(final_payable) as paid_payroll
        FROM salary
        WHERE shop_id = ${Number(shopId)} AND status = 'paid'
        GROUP BY staff_id
      ) paid_agg ON paid_agg.staff_id = st.id
      LEFT JOIN (
        SELECT staff_id, SUM(amount_paid) as total_advance
        FROM payouts
        WHERE shop_id = ${Number(shopId)} AND person_type = 'staff' AND is_advance = 1
        GROUP BY staff_id
      ) advance_agg ON advance_agg.staff_id = st.id
      LEFT JOIN (
        SELECT staff_id,
               SUM(CASE WHEN status = 'present' THEN 1 WHEN status = 'half' THEN 0.5 ELSE 0 END) as present_days,
               SUM(COALESCE(work_hours, 0)) as work_hours
        FROM attendance
        WHERE shop_id = ${Number(shopId)} AND attendance_date = CURRENT_DATE
        GROUP BY staff_id
      ) today_att ON today_att.staff_id = st.id
      WHERE st.shop_id = ${Number(shopId)} AND st.is_active = true
      ORDER BY st.name
    `

    return NextResponse.json({ staff })
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
    const body = await request.json()
    const sql = getDb()

    if (!body.name || !body.role || !body.salary_type || body.base_salary == null || !body.join_date) {
      return NextResponse.json(
        { error: "Missing required fields", details: "name, role, salary_type, base_salary, join_date are required" },
        { status: 400 }
      )
    }

    const staffMember = await sql`
      INSERT INTO staff (
        shop_id, name, phone, role, salary_type, base_salary, 
        join_date, description, account_name, account_number, 
        bank_name, ifsc_code, upi_id, is_active
      ) VALUES (
        ${Number(shopId)}, 
        ${body.name}, 
        ${body.phone || null}, 
        ${body.role}, 
        ${body.salary_type}, 
        ${Number(body.base_salary)}, 
        ${body.join_date}, 
        ${body.description || null}, 
        ${body.account_name || null}, 
        ${body.account_number || null}, 
        ${body.bank_name || null}, 
        ${body.ifsc_code || null}, 
        ${body.upi_id || null}, 
        true
      )
      RETURNING *
    `

    return NextResponse.json(staffMember[0], { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("POST Error:", message)
    return NextResponse.json(
      { error: "Internal server error", details: message },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  try {
    const { shopId } = await params
    const body = await request.json()
    const sql = getDb()

    await sql`
      UPDATE staff
      SET
        name = ${body.name},
        phone = ${body.phone || null},
        role = ${body.role},
        salary_type = ${body.salary_type},
        base_salary = ${Number(body.base_salary)},
        description = ${body.description || null},
        account_name = ${body.account_name || null},
        account_number = ${body.account_number || null},
        bank_name = ${body.bank_name || null},
        ifsc_code = ${body.ifsc_code || null},
        upi_id = ${body.upi_id || null}
      WHERE id = ${body.id} AND shop_id = ${Number(shopId)}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("PUT Error:", message)
    return NextResponse.json(
      { error: "Internal server error", details: message },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  try {
    const { shopId } = await params
    const body = await request.json()
    const sql = getDb()

    await sql`
      UPDATE staff
      SET is_active = false
      WHERE id = ${body.id} AND shop_id = ${Number(shopId)}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("DELETE Error:", message)
    return NextResponse.json(
      { error: "Internal server error", details: message },
      { status: 500 }
    )
  }
}