import { createClient } from "@supabase/supabase-js"

let agentClient: ReturnType<typeof createClient> | null = null

export function createAgentClient() {
  if (agentClient) return agentClient
  
  agentClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storageKey: "agent-auth-token",
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      }
    }
  )
  return agentClient
}
