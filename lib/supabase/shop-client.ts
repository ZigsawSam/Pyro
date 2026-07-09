import { createClient } from "@supabase/supabase-js"

let shopClient: ReturnType<typeof createClient> | null = null

export function createShopClient() {
  if (shopClient) return shopClient
  
  shopClient = createClient(
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
  return shopClient
}
