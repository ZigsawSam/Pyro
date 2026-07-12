import { verifyShopOwnership } from "@/lib/auth-guard"
import { ShopStaffPage } from "./staff-client"

export default async function StaffPage({
  params,
}: {
  params: Promise<{ shopId: string }>
}) {
  const { shopId } = await params
  const { user } = await verifyShopOwnership(shopId)
  return <ShopStaffPage shopId={shopId} user={user} />
}
