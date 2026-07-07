import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shopId: string; salaryId: string }> },
) {
  try {
    const { shopId, salaryId } = await params
    const sql = getDb()

    await sql`UPDATE salary SET status = 'paid' WHERE id = ${Number(salaryId)} AND shop_id = ${Number(shopId)}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
