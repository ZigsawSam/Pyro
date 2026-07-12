import { verifyShopOwnership } from "@/lib/auth-guard"
import { ShopSalesPage } from "./sales-client"

export default async function SalesPage({
  params,
}: {
  params: { shopId: string }
}) {
  const { user } = await verifyShopOwnership(params.shopId)
  return <ShopSalesPage shopId={params.shopId} user={user} />
}
