import { verifyShopOwnership } from "@/lib/auth-guard"
import { ShopAgentsPage } from "./agents-client"

export default async function AgentsPage({
  params,
}: {
  params: { shopId: string }
}) {
  const { user } = await verifyShopOwnership(params.shopId)
  return <ShopAgentsPage shopId={params.shopId} user={user} />
}
