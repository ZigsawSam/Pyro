import { verifyShopOwnership } from "@/lib/auth-guard"
import { ShopSalesPage } from "./sales-client"

export default async function SalesPage({
  params,
}: {
  params: Promise<{ shopId: string }>
}) {
  const { shopId } = await params
  const { user } = await verifyShopOwnership(shopId)
  return <ShopSalesPage shopId={shopId} user={user} />
}
