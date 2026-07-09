import { createClient } from "@supabase/supabase-js"

export function createShopClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storageKey: "shop-auth-token",
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      }
    }
  )
}
