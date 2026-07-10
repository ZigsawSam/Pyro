import { createClient } from "@supabase/supabase-js"

let shopClient: ReturnType<typeof createClient> | null = null

export function createShopClient() {
  if (shopClient) return shopClient
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!url || !key) {
    throw new Error("Missing Supabase environment variables")
  }
  
  shopClient = createClient(url, key, {
    auth: {
      storageKey: "shop-auth-token",
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    }
  })
  return shopClient
}
