import { verifyShopOwnership } from "@/lib/auth-guard"
import { ShopSalaryPage } from "./salary-client"

export default async function SalaryPage({
  params,
}: {
  params: { shopId: string }
}) {
  const { user } = await verifyShopOwnership(params.shopId)
  return <ShopSalaryPage shopId={params.shopId} user={user} />
}
