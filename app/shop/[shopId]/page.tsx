import { redirect } from "next/navigation"
import { verifyShopOwnership } from "@/lib/auth-guard"

export default async function ShopIdPage({
  params,
}: {
  params: Promise<{ shopId: string }>
}) {
  const { shopId } = await params
  await verifyShopOwnership(shopId)
  redirect(`/shop/${shopId}/dashboard`)
}
