import { verifyAgentAccess } from "@/lib/auth-guards"
import { AgentDashboardPage } from "./dashboard-client"

export default async function DashboardPage() {
  const { user, agentId } = await verifyAgentAccess()
  return <AgentDashboardPage user={user} agentId={agentId} />
}
