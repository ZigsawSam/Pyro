import { verifyShopOwnership } from "@/lib/auth-guard"
import { ShopAttendancePage } from "./attendance-client"

export default async function AttendancePage({
  params,
}: {
  params: Promise<{ shopId: string }>
}) {
  const { shopId } = await params
  const { user } = await verifyShopOwnership(shopId)
  return <ShopAttendancePage shopId={shopId} user={user} />
}
