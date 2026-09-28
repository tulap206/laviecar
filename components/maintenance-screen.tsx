import React from "react"
import Image from "next/image"
import { PhoneCall, MessageCircle, ShieldAlert, Clock, MapPin, Sparkles } from "lucide-react"

export default function MaintenanceScreen() {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 md:p-8 bg-[#0f0917] text-white overflow-hidden selection:bg-[#d4af37]/30">
      {/* Background Decorative Gradient Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] sm:w-[650px] sm:h-[650px] bg-purple-900/25 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-10 left-10 w-72 h-72 bg-indigo-900/20 rounded-full blur-[90px] pointer-events-none" />

      {/* Main Container Card */}
      <div className="relative z-10 w-full max-w-2xl bg-gradient-to-b from-[#1c1229]/90 to-[#140b20]/95 border border-purple-800/40 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl text-center">
        {/* Brand Header */}
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="relative flex items-center justify-center">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-purple-950/80 border border-purple-700/50 flex items-center justify-center shadow-lg overflow-hidden p-2">
              <Image
                src="/icon.png"
                alt="Lavie Car Rental Logo"
                width={80}
                height={80}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-amber-500 text-slate-950 rounded-full p-1.5 shadow-md border-2 border-[#1c1229]">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>

          <div className="space-y-1">
            <h2 className="text-sm uppercase tracking-[0.25em] font-semibold text-amber-400 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Lavie Car Rental
              <Sparkles className="w-3.5 h-3.5" />
            </h2>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Hệ thống tạm ngưng hoạt động
            </div>
          </div>
        </div>

        {/* Status Content */}
        <div className="mt-8 space-y-4">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Thông Báo Tạm Khóa Dịch Vụ
          </h1>
          <p className="text-sm sm:text-base text-purple-200/80 leading-relaxed max-w-lg mx-auto">
            Hệ thống website và trang quản trị của{" "}
            <span className="text-amber-300 font-medium">Lavie Car Rental</span> hiện đang tạm thời đưa vào trạng thái ngưng hoạt động.
          </p>
          <p className="text-xs sm:text-sm text-stone-400 leading-relaxed max-w-md mx-auto">
            Chúng tôi thành thật xin lỗi vì sự bất tiện này. Nếu quý khách hoặc đối tác cần hỗ trợ gấp, vui lòng liên hệ qua các kênh thông tin bên dưới.
          </p>
        </div>

        {/* Contact Actions */}
        <div className="mt-8 pt-6 border-t border-purple-900/40 space-y-3">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
            Kênh liên hệ trực tiếp
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
            <a
              href="tel:0363077775"
              className="flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl bg-purple-950/70 hover:bg-purple-900/80 border border-purple-700/50 hover:border-amber-400/60 text-white text-sm font-medium transition-all shadow-sm group"
            >
              <PhoneCall className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              <span>0363.077.775</span>
            </a>

            <a
              href="tel:0981323653"
              className="flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl bg-purple-950/70 hover:bg-purple-900/80 border border-purple-700/50 hover:border-amber-400/60 text-white text-sm font-medium transition-all shadow-sm group"
            >
              <PhoneCall className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              <span>0981.323.653</span>
            </a>

            <a
              href="https://zalo.me/0363077775"
              target="_blank"
              rel="noopener noreferrer"
              className="sm:col-span-2 flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-sm font-semibold transition-all shadow-lg hover:shadow-amber-500/20"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Liên hệ tư vấn qua Zalo</span>
            </a>
          </div>
        </div>

        {/* Footer Meta */}
        <div className="mt-8 pt-6 border-t border-purple-950/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-400">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-amber-400/80" />
            <span>TP. Huế, Thừa Thiên Huế</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400/80" />
            <span>Hỗ trợ 24/7 qua Hotline</span>
          </div>
        </div>
      </div>
    </div>
  )
}
