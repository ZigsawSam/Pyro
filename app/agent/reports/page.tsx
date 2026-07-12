import { verifyAgentAccess } from "@/lib/auth-guards"
import { AgentReportsPage } from "./reports-client"

export default async function ReportsPage() {
  const { user, agentId } = await verifyAgentAccess()
  return <AgentReportsPage user={user} agentId={agentId} />
}
