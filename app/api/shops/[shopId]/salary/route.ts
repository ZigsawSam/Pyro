import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  try {
    const { shopId } = await params
    const searchParams = request.nextUrl.searchParams
    const month = searchParams.get("month")
    const supabase = await createClient()
    const shopIdNum = Number(shopId)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: salaries, error } = await supabase
      .from("salary")
      .select(`
        id,
        shop_id,
        staff_id,
        month,
        base_salary,
        total_days,
        present_days,
        absent_days,
        half_days,
        daily_wage,
        earned_amount,
        deductions,
        bonus,
        final_payable,
        status,
        created_at,
        staff:staff_id (
          name,
          account_name,
          account_number,
          bank_name,
          ifsc_code,
          upi_id
        )
      `)
      .eq("shop_id", shopIdNum)
      .like("month", `${month}%`)
      .order("staff(name)", { ascending: true })

    if (error) {
      console.error("Error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const formatted = salaries?.map((s: any) => ({
      ...s,
      staff_name: s.staff?.name,
      account_name: s.staff?.account_name,
      account_number: s.staff?.account_number,
      bank_name: s.staff?.bank_name,
      ifsc_code: s.staff?.ifsc_code,
      upi_id: s.staff?.upi_id,
    })) || []

    return NextResponse.json({ salaries: formatted })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}