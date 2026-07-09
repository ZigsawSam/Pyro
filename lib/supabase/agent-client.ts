import { createBrowserClient } from "@supabase/ssr"
export function createAgentClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { storageKey: "agent-auth-token", autoRefreshToken: true, persistSession: true, detectSessionInUrl: true } }
  )
}
