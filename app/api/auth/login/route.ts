import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { signJWT } from "@/lib/auth-jwt"
import { hashPassword, generateSalt } from "@/lib/auth-crypto"
import { checkLoginAttempts, recordFailedLogin, resetLoginAttempts } from "@/lib/auth-guard"
import { logger } from "@/lib/logger"
import { getUserAvatarPublicUrl } from "@/lib/user-avatar"
import { SESSION_COOKIE, getJwtSecret } from "@/lib/auth-session"

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()
    const forwarded = request.headers.get("x-forwarded-for")
    const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "Unknown"

    if (!username || !password) {
      return NextResponse.json({ error: "Vui lòng điền đầy đủ thông tin" }, { status: 400 })
    }

    const lockoutCheck = await checkLoginAttempts(username)
    if (!lockoutCheck.allowed) {
      return NextResponse.json(
        { error: `Tài khoản bị tạm khóa. Vui lòng thử lại sau ${lockoutCheck.remainingMinutes} phút.` },
        { status: 423 }
      )
    }

    const { data: userRecord, error: fetchError } = await supabase
      .from("auth_users")
      .select("*")
      .eq("username", username)
      .single()

    if (fetchError || !userRecord) {
      await recordFailedLogin(username, ip)
      return NextResponse.json({ error: "Tên đăng nhập hoặc mật khẩu không đúng" }, { status: 401 })
    }

    let passwordIsValid = false

    if (userRecord.salt && userRecord.password_hash) {
      passwordIsValid = hashPassword(password, userRecord.salt) === userRecord.password_hash
    } else {
      passwordIsValid = userRecord.password === password
      if (passwordIsValid) {
        try {
          const newSalt = generateSalt()
          const newHash = hashPassword(password, newSalt)
          await supabase
            .from("auth_users")
            .update({ salt: newSalt, password_hash: newHash, password: null })
            .eq("username", username)
        } catch (migrationErr) {
          console.error(`Failed to migrate password hash for ${username}:`, migrationErr)
        }
      }
    }

    if (!passwordIsValid) {
      await recordFailedLogin(username, ip)
      return NextResponse.json({ error: "Tên đăng nhập hoặc mật khẩu không đúng" }, { status: 401 })
    }

    await resetLoginAttempts(username)

    const userData = {
      id: userRecord.id,
      username: userRecord.username,
      displayName: userRecord.displayname,
      role: userRecord.role,
      avatarUrl: getUserAvatarPublicUrl(userRecord.id, userRecord.updated_at || Date.now()),
      permissions: {
        canDelete: userRecord.role === "admin" || userRecord.can_delete || false,
        canBackup: userRecord.role === "admin" || userRecord.can_backup || false,
        canViewAccessHistory: userRecord.role === "admin" || userRecord.can_view_access_history || false,
        canManageUsers: userRecord.role === "admin" || userRecord.can_manage_users || false,
      },
    }

    const token = await signJWT({ ...userData, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 }, getJwtSecret())

    const response = NextResponse.json({ success: true, user: userData })
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    })

    try {
      await logger.log(
        userData.username,
        userData.displayName,
        "Đăng nhập",
        "Hệ thống",
        `${userData.displayName} đăng nhập thành công`
      )
    } catch {
      /* ignore logging errors */
    }

    return response
  } catch (error) {
    console.error("API login error:", error)
    return NextResponse.json({ error: "Lỗi máy chủ nội bộ" }, { status: 500 })
  }
}
