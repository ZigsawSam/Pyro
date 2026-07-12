import { verifyShopOwnership } from "@/lib/auth-guard"
import { ShopStaffPage } from "./staff-client"

export default async function StaffPage({
  params,
}: {
  params: { shopId: string }
}) {
  const { user } = await verifyShopOwnership(params.shopId)
  return <ShopStaffPage shopId={params.shopId} user={user} />
}
