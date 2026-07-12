import { verifyShopOwnership } from "@/lib/auth-guard"
import { ShopReportsPage } from "./reports-client"

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ shopId: string }>
}) {
  const { shopId } = await params
  const { user } = await verifyShopOwnership(shopId)
  return <ShopReportsPage shopId={shopId} user={user} />
}
