import { verifyShopOwnership } from "@/lib/auth-guard"
import { ShopDashboardPage } from "./dashboard-client"

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ shopId: string }>
}) {
  const { shopId } = await params
  const { user } = await verifyShopOwnership(shopId)
  return <ShopDashboardPage shopId={shopId} user={user} />
}
