import { createClient } from "@supabase/supabase-js"

let agentClient: ReturnType<typeof createClient> | null = null

export function createAgentClient() {
  if (agentClient) return agentClient
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!url || !key) {
    throw new Error("Missing Supabase environment variables")
  }
  
  agentClient = createClient(url, key, {
    auth: {
      storageKey: "agent-auth-token",
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    }
  })
  return agentClient
}
