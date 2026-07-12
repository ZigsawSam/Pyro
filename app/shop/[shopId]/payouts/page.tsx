import { verifyShopOwnership } from "@/lib/auth-guard"
import { ShopPayoutsPage } from "./payouts-client"

export default async function PayoutsPage({
  params,
}: {
  params: Promise<{ shopId: string }>
}) {
  const { shopId } = await params
  const { user } = await verifyShopOwnership(shopId)
  return <ShopPayoutsPage shopId={shopId} user={user} />
}
