import { verifyShopOwnership } from "@/lib/auth-guard"
import { InventoryPage } from "./inventory-client"

export default async function InventoryServerPage({
  params,
}: {
  params: Promise<{ shopId: string }>
}) {
  const { shopId } = await params
  const { user } = await verifyShopOwnership(shopId)
  return <InventoryPage shopId={shopId} user={user} />
}
