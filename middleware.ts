import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifyJWT } from "@/lib/auth-jwt"
import { SESSION_COOKIE, getJwtSecret } from "@/lib/auth-session"

const ipRequestMap = new Map<string, { count: number; resetAt: number }>()

const RATE_LIMITS: Record<string, { max: number; windowMs: number }> = {
  "/api/backup": { max: 3, windowMs: 300_000 },
  "/login": { max: 15, windowMs: 300_000 },
  "/api/auth/login": { max: 15, windowMs: 300_000 },
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  )
}

function isRateLimited(key: string, limit: { max: number; windowMs: number }): boolean {
  const now = Date.now()
  const record = ipRequestMap.get(key)

  if (!record || now > record.resetAt) {
    ipRequestMap.set(key, { count: 1, resetAt: now + limit.windowMs })
    return false
  }

  if (record.count >= limit.max) return true
  record.count++
  return false
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const ip = getClientIp(request)

  for (const [path, limit] of Object.entries(RATE_LIMITS)) {
    if (pathname.startsWith(path)) {
      const key = `${ip}:${path}`
      if (isRateLimited(key, limit)) {
        return NextResponse.json(
          { error: "Too many requests. Please try again later." },
          {
            status: 429,
            headers: { "Retry-After": String(Math.ceil(limit.windowMs / 1000)) },
          }
        )
      }
    }
  }

  if (pathname.startsWith("/dashboard")) {
    const sessionToken = request.cookies.get(SESSION_COOKIE)?.value

    if (!sessionToken) {
      const url = request.nextUrl.clone()
      url.pathname = "/login"
      return NextResponse.redirect(url)
    }

    const decoded = await verifyJWT(sessionToken, getJwtSecret())
    if (!decoded) {
      const url = request.nextUrl.clone()
      url.pathname = "/login"
      const response = NextResponse.redirect(url)
      response.cookies.delete(SESSION_COOKIE)
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
