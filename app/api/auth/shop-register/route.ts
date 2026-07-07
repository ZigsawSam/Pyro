import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { shopName, ownerName, email, phone, city, state } = await request.json()

    if (!shopName || !ownerName || !email || !phone) {
      return NextResponse.json(
        { error: "Shop name, owner name, email, and phone are required" },
        { status: 400 }
      )
    }

    const sql = getDb()

    // Check if shop with this email already exists
    const existingShops = await sql`
      SELECT id FROM shops WHERE email = ${email}
    `

    if (existingShops.length > 0) {
      return NextResponse.json({ error: "Shop with this email already exists" }, { status: 400 })
    }

    // Create new shop
    const result = await sql`
      INSERT INTO shops (shop_name, owner_name, email, phone, city, state, password_hash, created_at, updated_at)
      VALUES (${shopName}, ${ownerName}, ${email}, ${phone}, ${city || null}, ${state || null}, 'no-password', NOW(), NOW())
      RETURNING id, shop_name, owner_name, email
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Failed to create shop" }, { status: 500 })
    }

    const shop = result[0]

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
    console.error("Registration error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
