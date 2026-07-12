import { verifyAgentAccess } from "@/lib/auth-guards"
import { MyShopsPage } from "./shops-client"

export default async function ShopsPage() {
  const { user, agentId } = await verifyAgentAccess()
  return <MyShopsPage user={user} agentId={agentId} />
}
