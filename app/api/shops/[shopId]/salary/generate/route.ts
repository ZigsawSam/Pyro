import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  try {
    const { shopId } = await params
    const { month } = await request.json()
    const supabase = await createClient()
    const shopIdNum = Number(shopId)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    if (!month) {
      return NextResponse.json({ error: "Month is required" }, { status: 400 })
    }

    // Get all active staff for the shop
    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .select("id, base_salary")
      .eq("shop_id", shopIdNum)
      .eq("is_active", true)

    if (staffError) {
      console.error("Error generating salary:", staffError)
      return NextResponse.json({ error: staffError.message }, { status: 500 })
    }

    const monthStart = `${month}-01`
    const monthEnd = new Date(new Date(monthStart).getFullYear(), new Date(monthStart).getMonth() + 1, 0).toISOString().split("T")[0]

    // For each staff member, calculate salary based on attendance for the given month
    for (const member of staff || []) {
      const { data: attendance, error: attendanceError } = await supabase
        .from("attendance")
        .select("status")
        .eq("staff_id", member.id)
        .gte("attendance_date", monthStart)
        .lte("attendance_date", monthEnd)

      if (attendanceError) {
        console.error("Error generating salary:", attendanceError)
        return NextResponse.json({ error: attendanceError.message }, { status: 500 })
      }

      let presentDays = 0
      let halfDays = 0

      attendance?.forEach((record: any) => {
        if (record.status === "present") presentDays += 1
        else if (record.status === "half") halfDays += 0.5
      })

      const totalPresentDays = presentDays + halfDays

      // Get advances for the month
      const { data: advances, error: advancesError } = await supabase
        .from("payouts")
        .select("amount_paid")
        .eq("staff_id", member.id)
        .eq("is_advance", true)
        .gte("payment_date", monthStart)
        .lte("payment_date", monthEnd)

      if (advancesError) {
        console.error("Error generating salary:", advancesError)
        return NextResponse.json({ error: advancesError.message }, { status: 500 })
      }

      const totalAdvance = advances?.reduce((sum: number, w: any) => sum + (w.amount_paid || 0), 0) || 0
      const dailyRate = member.base_salary / 30
      const finalPayable = dailyRate * totalPresentDays - totalAdvance

      // Upsert salary record
      const { error: upsertError } = await supabase
        .from("salary")
        .upsert({
          staff_id: member.id,
          shop_id: shopIdNum,
          month: month,
          base_salary: member.base_salary,
          present_days: Math.round(totalPresentDays),
          final_payable: finalPayable,
          status: "pending",
        }, {
          onConflict: "staff_id,month",
        })

      if (upsertError) {
        console.error("Error generating salary:", upsertError)
        return NextResponse.json({ error: upsertError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error generating salary:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}