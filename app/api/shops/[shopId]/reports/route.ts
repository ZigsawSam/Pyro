import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  try {
    const { shopId } = await params
    const supabase = await createClient()
    const shopIdNum = Number(shopId)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Agent commission report
    const { data: agentLinks, error: linksError } = await supabase
      .from("shop_agent_links")
      .select("agent_id, agents:agent_id(name)")
      .eq("shop_id", shopIdNum)

    if (linksError) {
      console.error("Error:", linksError)
      return NextResponse.json({ error: linksError.message }, { status: 500 })
    }

    const agentIds = agentLinks?.map((l: any) => l.agent_id) || []

    const { data: salesData, error: salesError } = await supabase
      .from("sales")
      .select("agent_id, amount, commission_amount")
      .eq("shop_id", shopIdNum)
      .in("agent_id", agentIds)

    if (salesError) {
      console.error("Error:", salesError)
      return NextResponse.json({ error: salesError.message }, { status: 500 })
    }

    const salesMap = new Map<string, { total_sales: number; commission: number }>()
    salesData?.forEach((sale: any) => {
      const existing = salesMap.get(sale.agent_id) || { total_sales: 0, commission: 0 }
      existing.total_sales += sale.amount || 0
      existing.commission += sale.commission_amount || 0
      salesMap.set(sale.agent_id, existing)
    })

    const agentReport = (agentLinks || [])
      .map((link: any) => {
        const stats = salesMap.get(link.agent_id) || { total_sales: 0, commission: 0 }
        return {
          agent_name: link.agents?.name || "Unknown",
          total_sales: stats.total_sales,
          commission: stats.commission,
        }
      })
      .sort((a: any, b: any) => b.total_sales - a.total_sales)
      .slice(0, 10)

    // Payroll report
    const { data: payrollData, error: payrollError } = await supabase
      .from("salary")
      .select("month, final_payable, staff_id")
      .eq("shop_id", shopIdNum)

    if (payrollError) {
      console.error("Error:", payrollError)
      return NextResponse.json({ error: payrollError.message }, { status: 500 })
    }

    const payrollMap = new Map<string, { total_paid: number; staff_ids: Set<number> }>()
    payrollData?.forEach((record: any) => {
      const monthKey = record.month
      const existing = payrollMap.get(monthKey) || { total_paid: 0, staff_ids: new Set<number>() }
      existing.total_paid += record.final_payable || 0
      existing.staff_ids.add(record.staff_id)
      payrollMap.set(monthKey, existing)
    })

    const payrollReport = Array.from(payrollMap.entries())
      .map(([month, data]: [string, any]) => ({
        month: new Date(month).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        total_paid: data.total_paid,
        total_staff: data.staff_ids.size,
      }))
      .sort((a: any, b: any) => new Date(b.month).getTime() - new Date(a.month).getTime())
      .slice(0, 12)

    // Calculate totals
    const { data: totalSalesResult, error: totalSalesError } = await supabase
      .from("sales")
      .select("amount")
      .eq("shop_id", shopIdNum)

    if (totalSalesError) {
      console.error("Error:", totalSalesError)
      return NextResponse.json({ error: totalSalesError.message }, { status: 500 })
    }

    const { data: totalPayoutsResult, error: totalPayoutsError } = await supabase
      .from("payouts")
      .select("amount_paid")
      .eq("shop_id", shopIdNum)

    if (totalPayoutsError) {
      console.error("Error:", totalPayoutsError)
      return NextResponse.json({ error: totalPayoutsError.message }, { status: 500 })
    }

    const { data: totalSalaryResult, error: totalSalaryError } = await supabase
      .from("salary")
      .select("final_payable")
      .eq("shop_id", shopIdNum)

    if (totalSalaryError) {
      console.error("Error:", totalSalaryError)
      return NextResponse.json({ error: totalSalaryError.message }, { status: 500 })
    }

    const totalSales = totalSalesResult?.reduce((sum: number, s: any) => sum + (s.amount || 0), 0) || 0
    const totalCommission = totalPayoutsResult?.reduce((sum: number, p: any) => sum + (p.amount_paid || 0), 0) || 0
    const totalPayroll = totalSalaryResult?.reduce((sum: number, s: any) => sum + (s.final_payable || 0), 0) || 0

    return NextResponse.json({
      agent_report: agentReport,
      payroll_report: payrollReport,
      totals: {
        sales: totalSales,
        commission: totalCommission,
        payroll: totalPayroll,
      },
    })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}