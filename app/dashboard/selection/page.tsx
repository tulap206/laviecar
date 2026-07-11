"use client"

import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Shield, Car, LogOut, Receipt } from "lucide-react"
import Image from "next/image"

export default function SelectionPage() {
  const router = useRouter()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    router.push("/login")
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
      {/* Dark gradient overlay with purple tint for Laviecar */}
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/98 via-slate-950/95 to-purple-950/80 z-0" />
      {/* Ambient glow accents */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-700/10 rounded-full blur-3xl z-0" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl z-0" />

      <div className="relative w-full max-w-4xl z-10 flex flex-col items-center gap-8">
        {/* ── Brand Header ── */}
        <div className="flex flex-col items-center gap-4 text-center">
          {/* Logo */}
          <div className="w-24 h-24 relative rounded-full overflow-hidden flex-shrink-0 shadow-xl shadow-black/40 ring-2 ring-white/20">
            <Image
              src="/logo.jpg"
              alt="LAVIE CAR Logo"
              fill
              className="object-cover"
              priority
            />
          </div>

          {/* Brand name */}
          <div>
            <h1 className="text-4xl sm:text-5xl font-black italic tracking-tighter font-sans uppercase leading-none">
              <span className="bg-gradient-to-r from-purple-400 to-indigo-500 bg-clip-text text-transparent">LAVIE </span>
              <span className="text-purple-300">CAR</span>
            </h1>
            <p className="text-[11px] text-purple-400/80 font-semibold tracking-widest uppercase mt-1">
              Hệ thống quản trị và vận hành
            </p>
          </div>
          
          <p className="text-slate-300 text-sm max-w-md">
            Xin chào, <span className="text-purple-300 font-bold">{user?.displayName || "Quản trị viên"}</span>! Vui lòng chọn phân hệ làm việc dưới đây để tiếp tục.
          </p>
        </div>

        {/* ── Selection Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl mt-4">
          {/* Left card: Rental System */}
          <Card
            onClick={() => router.push("/dashboard")}
            className="cursor-pointer group relative overflow-hidden bg-white/95 hover:bg-white border border-white/20 hover:border-purple-500/40 rounded-3xl shadow-xl hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300 transform hover:-translate-y-1"
          >
            <CardContent className="p-8 flex flex-col items-center text-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center group-hover:bg-purple-600 transition-colors duration-300">
                <Car className="w-8 h-8 text-purple-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800 font-serif">Quản trị Cho thuê xe</h3>
                <p className="text-slate-500 text-sm mt-2">
                  Quản lý xe tự lái, hợp đồng thuê xe máy - ô tô, quản lý khách hàng, giao dịch, doanh thu & lợi nhuận.
                </p>
              </div>
              <span className="inline-flex items-center text-xs font-bold text-purple-600 group-hover:translate-x-1 transition-transform mt-2">
                Truy cập hệ thống &rarr;
              </span>
            </CardContent>
          </Card>

          {/* Right card: Loan Management System */}
          <Card
            onClick={() => router.push("/dashboard/loan-management")}
            className="cursor-pointer group relative overflow-hidden bg-white/95 hover:bg-white border border-white/20 hover:border-amber-500/40 rounded-3xl shadow-xl hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-300 transform hover:-translate-y-1"
          >
            <CardContent className="p-8 flex flex-col items-center text-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center group-hover:bg-amber-500 transition-colors duration-300">
                <Receipt className="w-8 h-8 text-amber-500 group-hover:text-white transition-colors duration-300" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800 font-serif">
                  Quản trị Cho vay
                </h3>
                <p className="text-slate-500 text-sm mt-2">
                  Hỗ trợ tài chính, quản lý khách vay, lập hợp đồng cho vay, theo dõi chu kỳ lãi suất, quản lý nợ xấu.
                </p>
              </div>
              <span className="inline-flex items-center text-xs font-bold text-amber-500 group-hover:translate-x-1 transition-transform mt-2">
                Truy cập hệ thống &rarr;
              </span>
            </CardContent>
          </Card>
        </div>

        {/* Logout Link */}
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="text-slate-400 hover:text-white hover:bg-white/5 rounded-xl text-xs gap-2 mt-4"
        >
          <LogOut className="w-4 h-4" />
          Đăng xuất tài khoản
        </Button>
      </div>
    </div>
  )
}
