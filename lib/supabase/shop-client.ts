import { createClient } from "@supabase/supabase-js"

let shopClient: ReturnType<typeof createClient> | null = null

// Fallback key for Vercel (env var sometimes fails to load)
const FALLBACK_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3aGNld2VpeW5mdmN5b2NyeGpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0MzkwODIsImV4cCI6MjA5OTAxNTA4Mn0.QILjmlWTNflJ7gCNzf5fLIAUvcAWFyBe_qz_VjQzzps"

export function createShopClient() {
  if (shopClient) return shopClient
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://jwhceweiynfvcyocrxjc.supabase.co"
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_ANON_KEY
  
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
