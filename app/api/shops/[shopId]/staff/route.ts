import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  try {
    const { shopId } = await params
    const supabase = await createClient()
    const shopIdNum = Number(shopId)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Get active staff
    const { data: staffData, error: staffError } = await supabase
      .from("staff")
      .select("*")
      .eq("shop_id", shopIdNum)
      .eq("is_active", true)
      .order("name")

    if (staffError) {
      const message = staffError.message
      console.error("GET Error:", message)
      return NextResponse.json(
        { error: "Internal server error", details: message },
        { status: 500 }
      )
    }

    const staffIds = staffData?.map((s: any) => s.id) || []

    // Get pending payroll per staff
    const { data: pendingData, error: pendingError } = await supabase
      .from("salary")
      .select("staff_id, final_payable")
      .eq("shop_id", shopIdNum)
      .neq("status", "paid")
      .in("staff_id", staffIds)

    if (pendingError) {
      const message = pendingError.message
      console.error("GET Error:", message)
      return NextResponse.json(
        { error: "Internal server error", details: message },
        { status: 500 }
      )
    }

    // Get paid payroll per staff
    const { data: paidData, error: paidError } = await supabase
      .from("salary")
      .select("staff_id, final_payable")
      .eq("shop_id", shopIdNum)
      .eq("status", "paid")
      .in("staff_id", staffIds)

    if (paidError) {
      const message = paidError.message
      console.error("GET Error:", message)
      return NextResponse.json(
        { error: "Internal server error", details: message },
        { status: 500 }
      )
    }

    // Get advances per staff
    const { data: advanceData, error: advanceError } = await supabase
      .from("payouts")
      .select("staff_id, amount_paid")
      .eq("shop_id", shopIdNum)
      .eq("person_type", "staff")
      .eq("is_advance", true)
      .in("staff_id", staffIds)

    if (advanceError) {
      const message = advanceError.message
      console.error("GET Error:", message)
      return NextResponse.json(
        { error: "Internal server error", details: message },
        { status: 500 }
      )
    }

    // Get today's attendance per staff
    const today = new Date().toISOString().split("T")[0]
    const { data: todayAtt, error: todayError } = await supabase
      .from("attendance")
      .select("staff_id, status, work_hours")
      .eq("shop_id", shopIdNum)
      .eq("attendance_date", today)
      .in("staff_id", staffIds)

    if (todayError) {
      const message = todayError.message
      console.error("GET Error:", message)
      return NextResponse.json(
        { error: "Internal server error", details: message },
        { status: 500 }
      )
    }

    // Build maps
    const pendingMap = new Map<number, number>()
    pendingData?.forEach((r: any) => {
      pendingMap.set(r.staff_id, (pendingMap.get(r.staff_id) || 0) + (r.final_payable || 0))
    })

    const paidMap = new Map<number, number>()
    paidData?.forEach((r: any) => {
      paidMap.set(r.staff_id, (paidMap.get(r.staff_id) || 0) + (r.final_payable || 0))
    })

    const advanceMap = new Map<number, number>()
    advanceData?.forEach((r: any) => {
      advanceMap.set(r.staff_id, (advanceMap.get(r.staff_id) || 0) + (r.amount_paid || 0))
    })

    const todayAttMap = new Map<number, { present_days: number; work_hours: number }>()
    todayAtt?.forEach((r: any) => {
      const existing = todayAttMap.get(r.staff_id) || { present_days: 0, work_hours: 0 }
      if (r.status === "present") existing.present_days += 1
      else if (r.status === "half") existing.present_days += 0.5
      existing.work_hours += r.work_hours || 0
      todayAttMap.set(r.staff_id, existing)
    })

    // Build result
    const staff = staffData?.map((st: any) => {
      const pending = pendingMap.get(st.id) || 0
      const paid = paidMap.get(st.id) || 0
      const advance = advanceMap.get(st.id) || 0
      const today = todayAttMap.get(st.id) || { present_days: 0, work_hours: 0 }

      let todayDue = 0
      if (st.salary_type === "hourly") {
        todayDue = today.work_hours * st.base_salary
      } else if (st.salary_type === "daily") {
        todayDue = today.present_days * st.base_salary
      } else {
        todayDue = today.present_days * (st.base_salary / 30.0)
      }

      return {
        ...st,
        pending_payroll: pending,
        paid_payroll: paid,
        total_advance: advance,
        today_present_days: today.present_days,
        today_work_hours: today.work_hours,
        today_due: todayDue,
      }
    }) || []

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
    const supabase = await createClient()
    const shopIdNum = Number(shopId)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    if (!body.name || !body.role || !body.salary_type || body.base_salary == null || !body.join_date) {
      return NextResponse.json(
        { error: "Missing required fields", details: "name, role, salary_type, base_salary, join_date are required" },
        { status: 400 }
      )
    }

    const { data: staffMember, error: insertError } = await supabase
      .from("staff")
      .insert({
        shop_id: shopIdNum,
        name: body.name,
        phone: body.phone || null,
        role: body.role,
        salary_type: body.salary_type,
        base_salary: Number(body.base_salary),
        join_date: body.join_date,
        description: body.description || null,
        account_name: body.account_name || null,
        account_number: body.account_number || null,
        bank_name: body.bank_name || null,
        ifsc_code: body.ifsc_code || null,
        upi_id: body.upi_id || null,
        is_active: true,
      })
      .select()
      .single()

    if (insertError) {
      const message = insertError.message
      console.error("POST Error:", message)
      return NextResponse.json(
        { error: "Internal server error", details: message },
        { status: 500 }
      )
    }

    return NextResponse.json(staffMember, { status: 201 })
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
    const supabase = await createClient()
    const shopIdNum = Number(shopId)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { error } = await supabase
      .from("staff")
      .update({
        name: body.name,
        phone: body.phone || null,
        role: body.role,
        salary_type: body.salary_type,
        base_salary: Number(body.base_salary),
        description: body.description || null,
        account_name: body.account_name || null,
        account_number: body.account_number || null,
        bank_name: body.bank_name || null,
        ifsc_code: body.ifsc_code || null,
        upi_id: body.upi_id || null,
      })
      .eq("id", body.id)
      .eq("shop_id", shopIdNum)

    if (error) {
      const message = error.message
      console.error("PUT Error:", message)
      return NextResponse.json(
        { error: "Internal server error", details: message },
        { status: 500 }
      )
    }

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
    const supabase = await createClient()
    const shopIdNum = Number(shopId)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { error } = await supabase
      .from("staff")
      .update({ is_active: false })
      .eq("id", body.id)
      .eq("shop_id", shopIdNum)

    if (error) {
      const message = error.message
      console.error("DELETE Error:", message)
      return NextResponse.json(
        { error: "Internal server error", details: message },
        { status: 500 }
      )
    }

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