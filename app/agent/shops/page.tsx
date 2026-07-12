import { MyShopsPage } from "@/lib/auth-guard"
import { MyShopsPage } from "./shops-client"

export default async function ShopsPage() {
  const { user, agentId } = await verifyAgentAccess()
  return <MyShopsPage user={user} agentId={agentId} />
}
