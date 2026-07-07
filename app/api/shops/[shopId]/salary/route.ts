import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  try {
    const { shopId } = await params
    const searchParams = request.nextUrl.searchParams
    const month = searchParams.get("month")
    const sql = getDb()

    const salaries = await sql`
      SELECT s.*, st.name as staff_name, st.account_name, st.account_number, st.bank_name, st.ifsc_code, st.upi_id
      FROM salary s
      JOIN staff st ON s.staff_id = st.id
      WHERE s.shop_id = ${Number(shopId)} AND s.month LIKE ${month + "%"}
      ORDER BY st.name
    `

    return NextResponse.json({ salaries })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
