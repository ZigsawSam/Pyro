// app/shop/[shopId]/page.tsx
import { redirect } from "next/navigation"
import { verifyShopOwnership } from "@/lib/auth-guard"

export default async function ShopIdPage({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params
  await verifyShopOwnership(shopId)
  // If ownership verified, redirect to dashboard
  redirect(`/shop/${shopId}/dashboard`)
}