"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, ArrowRight, Loader2, Car } from "lucide-react"
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
      <div className="min-h-screen flex flex-col items-center justify-center gap-4"
        style={{
          backgroundImage: 'url(/hue-car-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-purple-950/70 backdrop-blur-md" />
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-2 border-amber-400/30 border-t-amber-400 animate-spin" />
          <p className="text-white/70 text-sm font-medium">Đang tải...</p>
        </div>
      </div>
    )
  }

  if (user) {
    return null
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-6 relative"
      style={{
        backgroundImage: 'url(/hue-car-bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Gradient overlay — matches landing page Hero */}
      <div className="absolute inset-0 bg-gradient-to-tr from-purple-950/95 via-slate-950/90 to-indigo-950/90" />
      {/* Ambient glow blobs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-700/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm z-10">
        {/* Logo and Brand */}
        <div className="flex flex-col items-center mb-10">
          <div className="relative w-24 h-24 mb-6 rounded-2xl overflow-hidden border-2 border-purple-500/30 shadow-2xl shadow-purple-900/50">
            <Image
              src="/logo.jpg"
              alt="Lavie Car Rental Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-lg font-serif">
            Lavie Car Rental
          </h1>
          <p className="text-amber-300/90 text-sm mt-2 drop-shadow-md font-semibold tracking-wide uppercase">
            Hệ thống quản lý cho thuê xe ô tô
          </p>
        </div>

        {/* Login Card — Glassmorphism với viền tím */}
        <div className="bg-white/[0.07] backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl shadow-black/30">
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-white font-serif">Chào mừng trở lại</h2>
            <p className="text-white/50 text-sm mt-1">Đăng nhập để tiếp tục</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                Tên đăng nhập
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="admin"
                className="h-12 bg-white/10 border-white/10 text-white placeholder:text-white/30 rounded-xl focus:bg-white/15 focus:border-purple-400 focus:ring-purple-400/20 transition-all"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                Mật khẩu
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="h-12 pr-12 bg-white/10 border-white/10 text-white placeholder:text-white/30 rounded-xl focus:bg-white/15 focus:border-purple-400 focus:ring-purple-400/20 transition-all"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-300 bg-red-500/10 border border-red-400/20 p-3 rounded-xl">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative">
                  <input type="checkbox" className="peer sr-only" />
                  <div className="w-4 h-4 rounded border border-white/20 bg-white/10 peer-checked:bg-purple-600 peer-checked:border-purple-500 transition-all" />
                  <svg className="absolute top-0.5 left-0.5 w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-white/50 group-hover:text-white/80 transition-colors">Ghi nhớ</span>
              </label>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-purple-700 to-purple-900 hover:from-purple-600 hover:to-purple-800 text-white font-semibold rounded-xl transition-all hover-lift shadow-lg shadow-purple-900/40 border border-purple-500/20 group"
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
        </div>

        {/* Back to landing */}
        <div className="mt-6 text-center space-y-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-amber-300 transition-colors group"
          >
            <Car className="w-3.5 h-3.5" />
            <span>Quay về trang đặt xe</span>
          </Link>
          <p className="text-center text-xs font-semibold text-white/20 drop-shadow-lg">
            Lavie Car Rental Huế — By Phan Lê Tự Lập
          </p>
        </div>
      </div>
    </div>
  )
}
