import { verifyAgentAccess } from "@/lib/auth-guards"
import { EarningsOverviewPage } from "./earnings-client"

export default async function EarningsPage() {
  const { user, agentId } = await verifyAgentAccess()
  return <EarningsOverviewPage user={user} agentId={agentId} />
}
