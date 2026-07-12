import { verifyShopOwnership } from "@/lib/auth-guard"
import { ShopPayoutsPage } from "./payouts-client"

export default async function PayoutsPage({
  params,
}: {
  params: { shopId: string }
}) {
  const { user } = await verifyShopOwnership(params.shopId)
  return <ShopPayoutsPage shopId={params.shopId} user={user} />
}
