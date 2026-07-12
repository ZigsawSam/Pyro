import { verifyShopOwnership } from "@/lib/auth-guard"
import { InventoryPage } from "./inventory-client"

export default async function InventoryServerPage({
  params,
}: {
  params: { shopId: string }
}) {
  const { user } = await verifyShopOwnership(params.shopId)
  return <InventoryPage shopId={params.shopId} user={user} />
}
