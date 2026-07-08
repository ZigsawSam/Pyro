import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  try {
    const { shopId } = await params
    const supabase = await createClient()
    const shopIdNum = Number(shopId)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Verify shop exists
    const { data: shop, error: shopError } = await supabase
      .from("shops")
      .select("id, shop_name")
      .eq("id", shopIdNum)
      .single()

    if (shopError || !shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    // Get total sales
    const { data: totalSalesResult, error: salesError } = await supabase
      .from("sales")
      .select("amount")
      .eq("shop_id", shopIdNum)

    if (salesError) {
      console.error("Dashboard error:", salesError)
      return NextResponse.json({ error: salesError.message }, { status: 500 })
    }

    const totalSales = totalSalesResult?.reduce((sum: number, s: any) => sum + (s.amount || 0), 0) || 0

    // Get total commission
    const { data: commissionResult, error: commissionError } = await supabase
      .from("sales")
      .select("commission_amount")
      .eq("shop_id", shopIdNum)

    if (commissionError) {
      console.error("Dashboard error:", commissionError)
      return NextResponse.json({ error: commissionError.message }, { status: 500 })
    }

    const totalCommission = commissionResult?.reduce((sum: number, s: any) => sum + (s.commission_amount || 0), 0) || 0

    // Get total payouts
    const { data: payoutsResult, error: payoutsError } = await supabase
      .from("payouts")
      .select("amount_paid")
      .eq("shop_id", shopIdNum)

    if (payoutsError) {
      console.error("Dashboard error:", payoutsError)
      return NextResponse.json({ error: payoutsError.message }, { status: 500 })
    }

    const totalPaid = payoutsResult?.reduce((sum: number, p: any) => sum + (p.amount_paid || 0), 0) || 0

    // Get staff count
    const { data: staffResult, error: staffError } = await supabase
      .from("staff")
      .select("id", { count: "exact" })
      .eq("shop_id", shopIdNum)
      .eq("is_active", true)

    if (staffError) {
      console.error("Dashboard error:", staffError)
      return NextResponse.json({ error: staffError.message }, { status: 500 })
    }

    // Get pending salary
    const { data: pendingSalaryResult, error: salaryError } = await supabase
      .from("salary")
      .select("final_payable")
      .eq("shop_id", shopIdNum)
      .eq("status", "pending")

    if (salaryError) {
      console.error("Dashboard error:", salaryError)
      return NextResponse.json({ error: salaryError.message }, { status: 500 })
    }

    const pendingSalary = pendingSalaryResult?.reduce((sum: number, s: any) => sum + (s.final_payable || 0), 0) || 0

    // Get today's attendance
    const today = new Date().toISOString().split("T")[0]
    const { data: attendanceTodayResult, error: attendanceError } = await supabase
      .from("attendance")
      .select("id", { count: "exact" })
      .eq("shop_id", shopIdNum)
      .eq("attendance_date", today)
      .eq("status", "present")

    if (attendanceError) {
      console.error("Dashboard error:", attendanceError)
      return NextResponse.json({ error: attendanceError.message }, { status: 500 })
    }

    return NextResponse.json({
      data: {
        total_sales: totalSales,
        pending_commission: totalCommission - totalPaid,
        paid_commission: totalPaid,
        total_staff: staffResult?.length || 0,
        pending_salary: pendingSalary,
        attendance_today: attendanceTodayResult?.length || 0,
      },
      shopName: shop.shop_name,
    })
  } catch (error) {
    console.error("Dashboard error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}