import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export async function verifyShopOwnership(shopId: string) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {
          // Server components can't set cookies
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: shop } = await supabase
    .from("shops")
    .select("id")
    .eq("id", shopId)
    .eq("user_id", user.id)
    .single()

  if (!shop) {
    // User doesn't own this shop — redirect to their own shop
    const { data: userShop } = await supabase
      .from("shops")
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (userShop) {
      redirect(`/shop/${userShop.id}/dashboard`)
    }

    redirect("/auth/login")
  }

  return { user }
}

export async function verifyAgentAccess() {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const role = user.user_metadata?.role

  // If shop owner, redirect to their shop
  if (role === "shop") {
    const { data: shop } = await supabase
      .from("shops")
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (shop) {
      redirect(`/shop/${shop.id}/dashboard`)
    }
    redirect("/auth/login")
  }

  // Verify agent profile exists
  const { data: agent } = await supabase
    .from("agents")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (!agent) {
    redirect("/auth/login")
  }

  return { user, agentId: agent.id }
}
