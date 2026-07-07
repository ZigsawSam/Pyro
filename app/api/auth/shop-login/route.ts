import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const sql = getDb()
    const shops = await sql`
      SELECT id, shop_name, owner_name, email
      FROM shops WHERE email = ${email}
    `

    if (shops.length === 0) {
      return NextResponse.json({ error: "Shop not found" }, { status: 401 })
    }

    const shop = shops[0]

    return NextResponse.json({
      shop: {
        id: shop.id,
        shop_name: shop.shop_name,
        owner_name: shop.owner_name,
        email: shop.email,
      },
      token: Buffer.from(JSON.stringify({ shopId: shop.id })).toString("base64"),
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
