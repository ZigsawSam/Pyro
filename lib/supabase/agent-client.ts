import { createClient } from "@supabase/supabase-js"

export function createAgentClient() {
  return createClient(
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
}
