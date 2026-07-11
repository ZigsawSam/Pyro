import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return { response, user }
}

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  // Public routes - always allow
  if (pathname === "/" || pathname.startsWith("/auth") || pathname.startsWith("/_next") || pathname.startsWith("/api") || /\\.(svg|png|jpg|jpeg|gif|webp|ico|css|js)$/.test(pathname)) {
    return response
  }

  // Not logged in → login
  if (!user) {
    return NextResponse.redirect(new URL("/auth/login", request.url))
  }

  const role = user.user_metadata?.role
  if (pathname.startsWith("/shop") && role === "agent") {
    return NextResponse.redirect(new URL("/agent/dashboard", request.url))
  }
  if (pathname.startsWith("/agent") && role === "shop") {
    return NextResponse.redirect(new URL("/shop", request.url))
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.ico$).*)"],
}
