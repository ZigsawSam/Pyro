import { createClient } from "@supabase/supabase-js"

let dataClient: ReturnType<typeof createClient> | null = null

export function createDataClient() {
  if (dataClient) return dataClient
  dataClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { storageKey: "shop-auth-token", autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } }
  )
  return dataClient
}
