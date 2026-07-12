import { verifyShopOwnership } from "@/lib/auth-guard"
import { ShopAgentsPage } from "./agents-client"

export default async function AgentsPage({
  params,
}: {
  params: Promise<{ shopId: string }>
}) {
  const { shopId } = await params
  const { user } = await verifyShopOwnership(shopId)
  return <ShopAgentsPage shopId={shopId} user={user} />
}
