import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { verifyJWT } from "@/lib/auth-jwt"
import { hashPassword, generateSalt } from "@/lib/auth-crypto"
import { SESSION_COOKIE, getJwtSecret } from "@/lib/auth-session"

export async function POST(request: NextRequest) {
  try {
    const { oldPassword, newPassword } = await request.json()

    if (!oldPassword || !newPassword) {
      return NextResponse.json({ error: "Vui lòng nhập đầy đủ mật khẩu cũ và mật khẩu mới" }, { status: 400 })
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Mật khẩu mới phải từ 6 ký tự trở lên" }, { status: 400 })
    }

    const token = request.cookies.get(SESSION_COOKIE)?.value
    if (!token) {
      return NextResponse.json({ error: "Chưa đăng nhập hoặc phiên hết hạn" }, { status: 401 })
    }

    const decoded = await verifyJWT(token, getJwtSecret())
    if (!decoded) {
      return NextResponse.json({ error: "Phiên đăng nhập không hợp lệ" }, { status: 401 })
    }

    const { data: userRecord, error: fetchError } = await supabase
      .from("auth_users")
      .select("*")
      .eq("username", decoded.username)
      .single()

    if (fetchError || !userRecord) {
      return NextResponse.json({ error: "Không tìm thấy người dùng" }, { status: 404 })
    }

    let passwordIsValid = false
    if (userRecord.salt && userRecord.password_hash) {
      passwordIsValid = hashPassword(oldPassword, userRecord.salt) === userRecord.password_hash
    } else {
      passwordIsValid = userRecord.password === oldPassword
    }

    if (!passwordIsValid) {
      return NextResponse.json({ error: "Mật khẩu cũ không đúng" }, { status: 400 })
    }

    const newSalt = generateSalt()
    const newHash = hashPassword(newPassword, newSalt)
    const { error: updateError } = await supabase
      .from("auth_users")
      .update({ salt: newSalt, password_hash: newHash, password: null })
      .eq("username", decoded.username)

    if (updateError) throw updateError

    return NextResponse.json({ success: true, message: "Đổi mật khẩu thành công" })
  } catch (error) {
    console.error("Change password API error:", error)
    return NextResponse.json({ error: "Lỗi máy chủ khi đổi mật khẩu" }, { status: 500 })
  }
}
