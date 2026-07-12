import { verifyShopOwnership } from "@/lib/auth-guard"
import { ShopReportsPage } from "./reports-client"

export default async function ReportsPage({
  params,
}: {
  params: { shopId: string }
}) {
  const { user } = await verifyShopOwnership(params.shopId)
  return <ShopReportsPage shopId={params.shopId} user={user} />
}
