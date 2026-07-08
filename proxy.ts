import { type NextRequest, NextResponse } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request)

  if (request.nextUrl.pathname.startsWith("/agent/") && !user) {
    return NextResponse.redirect(new URL("/auth/agent-login", request.url))
  }

  if (request.nextUrl.pathname.startsWith("/shop/") && !user) {
    return NextResponse.redirect(new URL("/auth/shop-login", request.url))
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
