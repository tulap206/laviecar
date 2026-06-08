"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, ArrowRight, Loader2, Shield, MapPin, PhoneCall } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

export default function LoginPage() {
  const router = useRouter()
  const { login, user, isLoading: authLoading } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  })

  useEffect(() => {
    if (!authLoading && user) {
      router.push("/dashboard")
    }
  }, [user, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    const result = await login(formData.username, formData.password)

    if (result.success) {
      router.push("/dashboard")
    } else {
      setError(result.error || "Đăng nhập thất bại")
      setIsLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
      </div>
    )
  }

  if (user) {
    return null
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{
        backgroundImage: "url(/hue-car-bg.jpg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Dark gradient overlay matching hero section */}
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-900/97 via-slate-950/93 to-red-950/85 z-0" />
      {/* Ambient glow accents */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-700/10 rounded-full blur-3xl z-0" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-600/5 rounded-full blur-3xl z-0" />

      <div className="relative w-full max-w-md z-10 flex flex-col items-center gap-8">

        {/* ── Brand Header ── */}
        <div className="flex flex-col items-center gap-4 text-center">
          {/* Logo */}
          <div className="w-24 h-24 relative rounded-full overflow-hidden flex-shrink-0 shadow-xl shadow-black/40 ring-2 ring-white/20">
            <Image
              src="/logo.jpg?v=5"
              alt="QUÝ 79 Logo"
              fill
              className="object-cover"
              priority
            />
          </div>

          {/* Brand name — same style as navbar */}
          <div>
            <h1 className="text-4xl sm:text-5xl font-black italic tracking-tighter font-sans uppercase leading-none">
              <span className="bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">QUÝ </span>
              <span className="text-amber-400">79</span>
            </h1>
            <p className="text-[11px] text-red-400/80 font-semibold tracking-widest uppercase mt-1">
              Cho Thuê · Mua Bán · Cầm Cố Xe Máy · Ô Tô
            </p>
          </div>

          {/* Slogan */}
          <p className="text-amber-300/90 italic font-medium text-base tracking-wide drop-shadow">
            "Trao chìa khóa — kết nối hành trình"
          </p>
        </div>

        {/* ── Login Card ── */}
        <div className="w-full bg-white/95 backdrop-blur-sm rounded-3xl p-8 shadow-2xl shadow-black/40 border border-white/20">
          <div className="text-center mb-7">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-100 mb-3">
              <Shield className="w-3.5 h-3.5 text-red-600" />
              <span className="text-red-600 text-xs font-bold uppercase tracking-wider">Khu vực quản trị</span>
            </div>
            <h2 className="text-xl font-bold text-slate-800 font-serif">Chào mừng trở lại</h2>
            <p className="text-slate-500 text-sm mt-1">Đăng nhập để quản lý hệ thống</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Tên đăng nhập
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="admin"
                className="h-12 bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-xl focus:bg-white focus:border-red-500 focus:ring-red-500/20 transition-all"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
                disabled={isLoading}
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Mật khẩu
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="h-12 pr-12 bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-xl focus:bg-white focus:border-red-500 focus:ring-red-500/20 transition-all"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 p-3 rounded-xl flex items-start gap-2">
                <span className="mt-0.5">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Remember me */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative">
                  <input type="checkbox" className="peer sr-only" />
                  <div className="w-4 h-4 rounded border border-slate-300 bg-slate-50 peer-checked:bg-red-600 peer-checked:border-red-600 transition-all" />
                  <svg
                    className="absolute top-0.5 left-0.5 w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-slate-500 group-hover:text-slate-700 transition-colors text-xs">Ghi nhớ đăng nhập</span>
              </label>
            </div>

            {/* Submit button — red matching landing page CTA */}
            <Button
              type="submit"
              className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-900/20 group"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-3">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang đăng nhập...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>Đăng nhập</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              )}
            </Button>
          </form>

          {/* Back to home */}
          <p className="text-center text-xs text-slate-400 mt-6">
            <Link href="/" className="hover:text-red-600 transition-colors underline underline-offset-2">
              ← Quay về trang chủ
            </Link>
          </p>
        </div>

        {/* ── Footer ── */}
        <div className="text-center space-y-2 pb-4">
          <div className="flex items-center justify-center gap-4 text-xs text-slate-400/80">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-amber-400" />
              06 Nguyễn Trãi &amp; 9/38 Hồ Đắc Di, Huế
            </span>
          </div>
          <div className="flex items-center justify-center gap-1 text-xs text-slate-400/80">
            <PhoneCall className="w-3 h-3 text-amber-400" />
            <span>Hotline: 0762 75 3333</span>
          </div>
          <p className="text-xs text-slate-500/60 pt-1">
            © 2026 Quý 79 Moto · Phát triển bởi Phan Lê Tự Lập
          </p>
        </div>

      </div>
    </div>
  )
}
