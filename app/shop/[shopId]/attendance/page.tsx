import { verifyShopOwnership } from "@/lib/auth-guard"
import { ShopAttendancePage } from "./attendance-client"

export default async function AttendancePage({
  params,
}: {
  params: { shopId: string }
}) {
  const { user } = await verifyShopOwnership(params.shopId)
  return <ShopAttendancePage shopId={params.shopId} user={user} />
}
