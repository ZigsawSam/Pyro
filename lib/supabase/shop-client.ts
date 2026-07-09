import { createBrowserClient } from "@supabase/ssr"
export function createShopClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { storageKey: "shop-auth-token", autoRefreshToken: true, persistSession: true, detectSessionInUrl: true } }
  )
}
