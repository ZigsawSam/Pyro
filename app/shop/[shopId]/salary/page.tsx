import { verifyShopOwnership } from "@/lib/auth-guard"
import { ShopSalaryPage } from "./salary-client"

export default async function SalaryPage({
  params,
}: {
  params: Promise<{ shopId: string }>
}) {
  const { shopId } = await params
  const { user } = await verifyShopOwnership(shopId)
  return <ShopSalaryPage shopId={shopId} user={user} />
}
