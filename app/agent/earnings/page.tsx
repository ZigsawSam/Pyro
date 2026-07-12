import { EarningsOverviewPage } from "@/lib/auth-guard"
import { EarningsOverviewPage } from "./earnings-client"

export default async function EarningsPage() {
  const { user, agentId } = await verifyAgentAccess()
  return <EarningsOverviewPage user={user} agentId={agentId} />
}
