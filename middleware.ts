import { NextResponse, type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  const publicRoutes = [
    "/auth/login",
    "/auth/register",
    "/auth/shop-login",
    "/auth/shop-register",
    "/auth/agent-login",
    "/auth/agent-register",
    "/logout",
  ]
  const isPublic = publicRoutes.some((route) => pathname.startsWith(route))

  if (isPublic) {
    if (user) {
      const role = user.user_metadata?.role
      if (role === "agent") {
        return NextResponse.redirect(new URL("/agent/dashboard", request.url))
      }
      return NextResponse.redirect(new URL("/shop", request.url))
    }
    return response
  }

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
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
