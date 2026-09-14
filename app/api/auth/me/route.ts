import { NextRequest, NextResponse } from "next/server"
import { verifyJWT } from "@/lib/auth-jwt"
import { getUserAvatarPublicUrl } from "@/lib/user-avatar"
import { SESSION_COOKIE, getJwtSecret } from "@/lib/auth-session"

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE)?.value
    if (!token) {
      return NextResponse.json({ authenticated: false })
    }

    const decoded = await verifyJWT(token, getJwtSecret())
    if (!decoded) {
      return NextResponse.json({ authenticated: false })
    }

    const { exp: _exp, ...userData } = decoded
    if (userData.id && !userData.avatarUrl) {
      userData.avatarUrl = getUserAvatarPublicUrl(userData.id)
    }
    return NextResponse.json({ authenticated: true, user: userData })
  } catch (error) {
    console.error("API /api/auth/me error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
