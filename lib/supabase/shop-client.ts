import { createBrowserClient } from "@supabase/ssr"

export function createShopClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storageKey: "shop-auth-token",
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
      cookieOptions: {
        name: "shop-auth-token",
        lifetime: 60 * 60 * 24 * 7, // 7 days
        domain: "",
        path: "/",
        sameSite: "lax",
      }
    }
  )
}
