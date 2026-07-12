import { verifyShopOwnership } from "@/lib/auth-guard"
import { ShopDashboardPage } from "./dashboard-client"

export default async function DashboardPage({
  params,
}: {
  params: { shopId: string }
}) {
  const { user } = await verifyShopOwnership(params.shopId)
  return <ShopDashboardPage shopId={params.shopId} user={user} />
}
