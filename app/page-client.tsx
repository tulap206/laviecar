"use client"

import { useState, useEffect } from "react"
import {
  fetchVehicles,
  fetchRentals,
  fetchCustomers,
  insertCustomer,
  insertRental,
} from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Car,
  User,
  Phone,
  MapPin,
  Facebook,
  Bike,
  Shield,
  Clock,
  CheckCircle,
  ArrowRight,
  X,
  PhoneCall,
  Check,
  Loader2,
  MessageCircle,
  ExternalLink,
  Menu,
  Calendar,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { BlurFade } from "@/components/ui/blur-fade"
import { ShimmerButton } from "@/components/ui/shimmer-button"
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text"
import { BorderBeam } from "@/components/ui/border-beam"
import { NumberTicker } from "@/components/ui/number-ticker"
import { Marquee } from "@/components/ui/marquee"
import { cn } from "@/lib/utils"

const FLEET = [
  {
    name: "Sedan đô thị",
    image: "/sedan.jpg",
    alt: "Thuê xe sedan tự lái tại Huế - Lavie Car",
    tag: "4–5 chỗ",
    blurb: "Honda Civic, Mazda 3, VinFast Lux A hoặc tương đương — gọn, êm, đi phố.",
    price: 800000,
    points: ["Số tự động, điều hòa mát", "Phù hợp nội thành & lân cận"],
    featured: false,
  },
  {
    name: "SUV đa dụng",
    image: "/suv.jpg",
    alt: "Thuê xe SUV tự lái tại Huế - Lavie Car",
    tag: "5–7 chỗ",
    blurb: "Santa Fe, CR-V, Tucson hoặc tương đương — gầm cao, cốp rộng cho cả nhà.",
    price: 900000,
    points: ["Gầm cao, cốp rộng", "Hợp gia đình khám phá Huế"],
    featured: true,
  },
  {
    name: "Cao cấp / điện",
    image: "/luxury.jpg",
    alt: "Thuê xe điện VinFast cao cấp tại Huế - Lavie Car",
    tag: "VinFast & premium",
    blurb: "VF3–VF9, Limo Green hoặc tương đương — êm, tiết kiệm, đi xa thoải mái.",
    price: 500000,
    points: ["Công nghệ hiện đại", "Êm ái cho lộ trình ngoại tỉnh"],
    featured: false,
  },
] as const

const MARQUEE_ITEMS = [
  "Tự lái & có lái",
  "City Tour Huế",
  "Đón tiễn sân bay Phú Bài",
  "Hợp đồng du lịch liên tỉnh",
  "Bảo hiểm đầy đủ",
  "Hỗ trợ 24/7",
  "Giao xe trung tâm miễn phí",
]

const PROCESS_STEPS = [
  {
    step: "01",
    title: "Đặt xe online",
    body: "Điền form — hệ thống lọc xe trống đúng ngày bạn cần.",
  },
  {
    step: "02",
    title: "Xác nhận & giao xe",
    body: "Admin duyệt nhanh, gọi hướng dẫn nhận xe tận nơi tại Huế.",
  },
  {
    step: "03",
    title: "Khám phá & trả xe",
    body: "Lăng tẩm, đèo Hải Vân — trả xe gọn khi kết thúc chuyến đi.",
  },
]

export default function LandingPageClient() {
  const [activeTab, setActiveTab] = useState<"car" | "moto">("car")
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    startDate: "",
    endDate: "",
  })

  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [availableVehicles, setAvailableVehicles] = useState<any[]>([])
  const [totalDays, setTotalDays] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [bookingSuccess, setBookingSuccess] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null)
  const [isOpenContact, setIsOpenContact] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [formError, setFormError] = useState("")

  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate)
      const end = new Date(formData.endDate)
      if (start <= end) {
        const diffTime = Math.abs(end.getTime() - start.getTime())
        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        setTotalDays(days === 0 ? 1 : days)
      } else {
        setTotalDays(0)
      }
    } else {
      setTotalDays(0)
    }
  }, [formData.startDate, formData.endDate])

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setFormError("")

    if (!formData.name || !formData.phone || !formData.startDate || !formData.endDate) {
      setFormError("Vui lòng nhập đầy đủ họ tên, số điện thoại và thời gian thuê xe.")
      return
    }

    const start = new Date(formData.startDate)
    const end = new Date(formData.endDate)
    if (start > end) {
      setFormError("Ngày nhận xe phải trước hoặc trùng ngày trả xe.")
      return
    }

    setIsLoading(true)
    try {
      const [vehicles, rentals] = await Promise.all([fetchVehicles(), fetchRentals()])

      const conflictingVehicleIds = new Set(
        rentals
          .filter((rental: any) => {
            if (rental.status === "cancelled") return false

            const parseDate = (dStr: string) => {
              const parts = dStr.split("/")
              return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]))
            }

            const rStart = parseDate(rental.startDate)
            const rEnd = parseDate(rental.endDate)

            return !(end < rStart || start > rEnd)
          })
          .map((rental: any) => rental.vehicleId)
      )

      const available = vehicles.filter((vehicle: any) => {
        return vehicle.status === "available" && !conflictingVehicleIds.has(vehicle.id)
      })

      setAvailableVehicles(available)
      setIsModalOpen(true)
    } catch (error) {
      console.error("Lỗi khi tìm xe:", error)
      setFormError("Không thể tìm xe trống lúc này. Vui lòng thử lại hoặc gọi hotline.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmBooking = async (vehicle: any) => {
    setSelectedVehicle(vehicle)
    setIsSubmitting(true)
    try {
      const customersList = await fetchCustomers()
      let customer = customersList.find((c: any) => c.phone === formData.phone)
      let customerId = ""

      if (customer) {
        customerId = customer.id
      } else {
        const newCustomer = await insertCustomer({
          name: formData.name,
          phone: formData.phone,
          facebook: "",
          address: formData.address || "",
          idcard: "",
          totalrentals: 0,
          status: "active",
          customerphoto: [],
          cccdfront: [],
          cccdback: [],
          licensefront: [],
          licenseback: [],
        })
        customerId = newCustomer.id
      }

      const formatDateStr = (dateInput: string) => {
        const d = new Date(dateInput)
        const day = String(d.getDate()).padStart(2, "0")
        const month = String(d.getMonth() + 1).padStart(2, "0")
        const year = d.getFullYear()
        return `${day}/${month}/${year}`
      }

      const formattedStart = formatDateStr(formData.startDate)
      const formattedEnd = formatDateStr(formData.endDate)
      const totalPrice = totalDays * vehicle.pricePerDay

      await insertRental({
        customerId,
        customerName: formData.name,
        vehicleId: vehicle.id,
        vehicleName: vehicle.name,
        licensePlate: vehicle.licensePlate,
        startDate: formattedStart,
        endDate: formattedEnd,
        totalDays,
        pricePerDay: vehicle.pricePerDay,
        totalPrice,
        deposit: 0,
        extraFees: 0,
        notes: "Khách đặt trực tuyến từ website",
        revenue: 0,
        status: "pending",
      })

      setBookingSuccess(true)
    } catch (error) {
      console.error("Lỗi khi đặt xe:", error)
      setFormError("Không gửi được yêu cầu đặt xe. Vui lòng liên hệ hotline.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const closeBookingModal = () => {
    setIsModalOpen(false)
    setBookingSuccess(false)
    setSelectedVehicle(null)
  }

  return (
    <div className="min-h-screen bg-[#f7f5f2] text-stone-800 selection:bg-[#5b2d8e] selection:text-white">
      <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-[#f7f5f2]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:h-[4.25rem] sm:px-6 lg:px-8">
          <a href="#top" className="flex items-center gap-2.5">
            <div className="relative size-11 overflow-hidden rounded-xl border border-stone-200 bg-[#1a1025] shadow-sm sm:size-12">
              <Image
                src="/logo.jpg"
                alt="Logo Lavie Car Rental"
                fill
                className="object-contain"
                onError={(e) => {
                  ;(e.target as HTMLElement).style.display = "none"
                }}
              />
            </div>
            <div className="leading-tight">
              <span className="block text-lg font-bold tracking-tight text-[#1a1025] sm:text-xl">
                Lavie Car
              </span>
              <span className="block text-[11px] font-medium text-stone-500">
                Thuê ô tô tự lái tại Huế
              </span>
            </div>
          </a>

          <nav className="hidden items-center gap-7 text-sm font-medium text-stone-600 md:flex">
            <a href="#booking" className="transition-colors hover:text-[#5b2d8e]">
              Đặt xe
            </a>
            <a href="#why" className="transition-colors hover:text-[#5b2d8e]">
              Vì sao chọn chúng tôi
            </a>
            <a href="#fleet" className="transition-colors hover:text-[#5b2d8e]">
              Bảng giá
            </a>
            <a href="#process" className="transition-colors hover:text-[#5b2d8e]">
              Quy trình
            </a>
            <a href="#contact" className="transition-colors hover:text-[#5b2d8e]">
              Liên hệ
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition-colors hover:border-[#5b2d8e]/40 hover:text-[#5b2d8e] sm:inline-flex"
            >
              <User className="size-4" />
              Đăng nhập
            </Link>
            <button
              type="button"
              className="inline-flex size-10 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-700 md:hidden"
              aria-label={mobileNavOpen ? "Đóng menu" : "Mở menu"}
              onClick={() => setMobileNavOpen((v) => !v)}
            >
              {mobileNavOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {mobileNavOpen && (
          <div className="border-t border-stone-100 bg-white px-4 py-3 md:hidden">
            <div className="flex flex-col gap-1 text-sm font-medium text-stone-700">
              {[
                ["#booking", "Đặt xe"],
                ["#why", "Vì sao chọn chúng tôi"],
                ["#fleet", "Bảng giá"],
                ["#process", "Quy trình"],
                ["#contact", "Liên hệ"],
                ["/login", "Đăng nhập"],
              ].map(([href, label]) =>
                href.startsWith("/") ? (
                  <Link
                    key={href}
                    href={href}
                    className="rounded-lg px-3 py-2.5 hover:bg-stone-50"
                    onClick={() => setMobileNavOpen(false)}
                  >
                    {label}
                  </Link>
                ) : (
                  <a
                    key={href}
                    href={href}
                    className="rounded-lg px-3 py-2.5 hover:bg-stone-50"
                    onClick={() => setMobileNavOpen(false)}
                  >
                    {label}
                  </a>
                )
              )}
            </div>
          </div>
        )}
      </header>

      <main id="top">
        <section className="relative isolate min-h-[100dvh] overflow-hidden text-white">
          <Image
            src="/hue-car-bg.jpg"
            alt="Thuê xe ô tô tự lái tại Huế — Lavie Car"
            fill
            priority
            className="object-cover object-[center_40%]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(118deg,rgba(26,16,37,0.92)_0%,rgba(45,27,78,0.72)_45%,rgba(26,16,37,0.88)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(196,165,116,0.18),transparent_50%)]" />

          <div className="relative z-10 mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-12 lg:items-center lg:gap-12 lg:px-8 lg:py-20">
            <div className="space-y-7 lg:col-span-6">
              <BlurFade delay={0.05} direction="up" offset={12}>
                <p className="text-sm font-semibold tracking-[0.18em] text-[#e8d5a8]/90 uppercase">
                  Lavie Car Rental
                </p>
              </BlurFade>

              <BlurFade delay={0.12} direction="up" offset={16}>
                <h1 className="max-w-[15ch] text-4xl font-bold tracking-tight text-balance text-white sm:text-5xl lg:text-[3.35rem] lg:leading-[1.08]">
                  Xe của bạn,{" "}
                  <AnimatedGradientText
                    colorFrom="#e8d5a8"
                    colorTo="#f5efe3"
                    speed={0.85}
                    className="font-bold"
                  >
                    hành trình của bạn
                  </AnimatedGradientText>
                </h1>
              </BlurFade>

              <BlurFade delay={0.2} direction="up" offset={14}>
                <p className="max-w-[44ch] text-base leading-relaxed text-stone-200 sm:text-lg">
                  Thuê ô tô tự lái và có lái tại Huế — city tour, đón tiễn sân bay Phú Bài, hợp đồng
                  liên tỉnh. Xe đời mới, giá minh bạch, hỗ trợ 24/7.
                </p>
              </BlurFade>

              <BlurFade delay={0.28} direction="up" offset={12}>
                <div className="flex flex-wrap items-center gap-3">
                  <ShimmerButton
                    type="button"
                    background="rgb(91 45 142)"
                    shimmerColor="#e8d5a8"
                    borderRadius="14px"
                    className="h-12 px-7 text-sm font-semibold shadow-lg shadow-black/30"
                    onClick={() => {
                      document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" })
                    }}
                  >
                    Đặt xe ngay
                    <ArrowRight className="ml-2 size-4" />
                  </ShimmerButton>
                  <a
                    href="tel:0363077775"
                    className="inline-flex h-12 items-center gap-2 rounded-[14px] border border-white/20 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/15"
                  >
                    <PhoneCall className="size-4" />
                    0363.077.775
                  </a>
                </div>
              </BlurFade>

              <BlurFade delay={0.36} direction="up" offset={10}>
                <div className="flex flex-wrap gap-x-8 gap-y-4 border-t border-white/15 pt-6">
                  <div>
                    <div className="flex items-baseline gap-1">
                      <NumberTicker value={500} className="text-2xl font-bold text-white" />
                      <span className="text-sm text-stone-300">k+</span>
                    </div>
                    <p className="text-xs text-stone-400">đồng/ngày từ</p>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1">
                      <NumberTicker value={24} className="text-2xl font-bold text-white" />
                      <span className="text-sm text-stone-300">/7</span>
                    </div>
                    <p className="text-xs text-stone-400">hỗ trợ sự cố</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 pt-1">
                      <Shield className="size-5 text-[#e8d5a8]" />
                      <p className="text-sm font-medium text-stone-200">Bảo hiểm đầy đủ</p>
                    </div>
                  </div>
                </div>
              </BlurFade>
            </div>

            <BlurFade delay={0.22} direction="up" offset={20} className="lg:col-span-6">
              <div
                id="booking"
                className="relative scroll-mt-24 overflow-hidden rounded-2xl border border-white/15 bg-white text-stone-900 shadow-2xl shadow-black/30"
              >
                <BorderBeam
                  size={120}
                  duration={9}
                  borderWidth={1.5}
                  colorFrom="#5b2d8e"
                  colorTo="#c4a574"
                />

                <div className="flex border-b border-stone-100">
                  <button
                    type="button"
                    onClick={() => setActiveTab("car")}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-colors",
                      activeTab === "car"
                        ? "bg-[#1a1025] text-[#e8d5a8]"
                        : "bg-white text-stone-500 hover:bg-stone-50 hover:text-[#5b2d8e]"
                    )}
                  >
                    <Car className="size-4" />
                    Thuê ô tô
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("moto")}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-colors",
                      activeTab === "moto"
                        ? "bg-[#1a1025] text-[#e8d5a8]"
                        : "bg-white text-stone-500 hover:bg-stone-50 hover:text-[#5b2d8e]"
                    )}
                  >
                    <Bike className="size-4" />
                    Thuê xe máy
                  </button>
                </div>

                <div className="p-6 sm:p-8">
                  {activeTab === "car" ? (
                    <div className="space-y-5">
                      <div>
                        <h2 className="text-xl font-bold tracking-tight text-[#1a1025] sm:text-2xl">
                          Đặt xe trực tuyến
                        </h2>
                        <p className="mt-1 text-sm text-stone-500">
                          Kiểm tra xe trống theo ngày — xác nhận trong vài phút.
                        </p>
                      </div>

                      <form onSubmit={handleSearch} className="space-y-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="name" className="text-sm font-medium text-stone-700">
                            Họ và tên *
                          </Label>
                          <div className="relative">
                            <User className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-stone-400" />
                            <Input
                              id="name"
                              type="text"
                              required
                              placeholder="Nguyễn Văn A"
                              className="h-12 rounded-xl border-stone-200 bg-stone-50 pl-11 text-base focus:bg-white"
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="phone" className="text-sm font-medium text-stone-700">
                            Số điện thoại *
                          </Label>
                          <div className="relative">
                            <Phone className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-stone-400" />
                            <Input
                              id="phone"
                              type="tel"
                              required
                              placeholder="0363 077 775"
                              className="h-12 rounded-xl border-stone-200 bg-stone-50 pl-11 text-base focus:bg-white"
                              value={formData.phone}
                              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div className="min-w-0 space-y-1.5">
                            <Label htmlFor="startDate" className="text-sm font-medium text-stone-700">
                              Ngày nhận *
                            </Label>
                            <div className="relative">
                              <Calendar className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-stone-400" />
                              <Input
                                id="startDate"
                                type="date"
                                required
                                className="h-12 rounded-xl border-stone-200 bg-stone-50 pl-11 text-sm focus:bg-white"
                                value={formData.startDate}
                                onChange={(e) =>
                                  setFormData({ ...formData, startDate: e.target.value })
                                }
                              />
                            </div>
                          </div>
                          <div className="min-w-0 space-y-1.5">
                            <Label htmlFor="endDate" className="text-sm font-medium text-stone-700">
                              Ngày trả *
                            </Label>
                            <div className="relative">
                              <Calendar className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-stone-400" />
                              <Input
                                id="endDate"
                                type="date"
                                required
                                className="h-12 rounded-xl border-stone-200 bg-stone-50 pl-11 text-sm focus:bg-white"
                                value={formData.endDate}
                                onChange={(e) =>
                                  setFormData({ ...formData, endDate: e.target.value })
                                }
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="address" className="text-sm font-medium text-stone-700">
                            Địa chỉ / nơi nhận xe
                          </Label>
                          <div className="relative">
                            <MapPin className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-stone-400" />
                            <Input
                              id="address"
                              type="text"
                              placeholder="Khách sạn, sân bay Phú Bài…"
                              className="h-12 rounded-xl border-stone-200 bg-stone-50 pl-11 text-base focus:bg-white"
                              value={formData.address}
                              onChange={(e) =>
                                setFormData({ ...formData, address: e.target.value })
                              }
                            />
                          </div>
                        </div>

                        {formError ? (
                          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                            {formError}
                          </p>
                        ) : null}

                        <Button
                          type="submit"
                          disabled={isLoading}
                          className="mt-1 h-12 w-full rounded-xl bg-[#5b2d8e] text-base font-semibold text-white shadow-md shadow-[#5b2d8e]/25 hover:bg-[#4a2474]"
                        >
                          {isLoading ? (
                            <span className="inline-flex items-center gap-2">
                              <Loader2 className="size-5 animate-spin" />
                              Đang tìm xe trống…
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2">
                              Tìm xe trống & báo giá
                              <ArrowRight className="size-4" />
                            </span>
                          )}
                        </Button>
                      </form>
                    </div>
                  ) : (
                    <div className="flex min-h-[420px] flex-col justify-between gap-6">
                      <div className="space-y-4 text-center">
                        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#1a1025] text-[#e8d5a8]">
                          <Bike className="size-7" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold tracking-tight text-[#1a1025]">
                            Thuê xe máy tại Huế
                          </h2>
                          <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-stone-500">
                            Xe số, xe ga, côn tay — giao tận nơi, giá từ 120.000đ/ngày.
                          </p>
                        </div>

                        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-left">
                          <div className="flex items-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-xl bg-[#1a1025] text-sm font-bold text-[#e8d5a8]">
                              3L
                            </div>
                            <div>
                              <p className="text-sm font-bold text-stone-900">3L Moto Huế</p>
                              <p className="text-xs text-stone-500">Đối tác thuê xe máy của Lavie</p>
                            </div>
                          </div>
                          <ul className="mt-3 space-y-1.5 text-xs text-stone-600">
                            <li className="flex items-center gap-2">
                              <CheckCircle className="size-3.5 shrink-0 text-[#5b2d8e]" />
                              Đa dạng dòng xe, bảo dưỡng định kỳ
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle className="size-3.5 shrink-0 text-[#5b2d8e]" />
                              Kèm mũ bảo hiểm & áo mưa
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle className="size-3.5 shrink-0 text-[#5b2d8e]" />
                              Hỗ trợ 24/7
                            </li>
                          </ul>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <a
                          href="https://3lmotohue.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1a1025] text-sm font-semibold text-white transition-colors hover:bg-[#2d1b4e]"
                        >
                          Đặt xe tại 3lmotohue.com
                          <ExternalLink className="size-4" />
                        </a>
                        <p className="text-center text-[11px] text-stone-400">
                          Bạn sẽ được chuyển sang trang 3L Moto Huế
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </BlurFade>
          </div>
        </section>

        <section className="border-y border-stone-200/80 bg-white py-3" aria-label="Dịch vụ">
          <Marquee pauseOnHover className="[--duration:38s] [--gap:2.5rem]">
            {MARQUEE_ITEMS.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-2 text-sm font-medium text-stone-600"
              >
                <CheckCircle className="size-4 text-[#5b2d8e]" />
                {item}
              </span>
            ))}
          </Marquee>
        </section>

        <section id="why" className="scroll-mt-24 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <BlurFade inView direction="up" offset={14}>
              <div className="max-w-2xl">
                <p className="text-sm font-semibold tracking-wide text-[#5b2d8e]">Vì sao Lavie Car</p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#1a1025] text-balance sm:text-4xl">
                  Thuê xe rõ ràng — đi Huế nhẹ đầu
                </h2>
                <p className="mt-3 max-w-[55ch] text-base leading-relaxed text-stone-600">
                  Giá cạnh tranh, không phí ẩn. Đội xe sedan đến SUV và xe điện đời mới, bảo dưỡng
                  định kỳ, đồng hành kỹ thuật suốt hành trình.
                </p>
              </div>
            </BlurFade>

            <div className="mt-12 grid gap-5 lg:grid-cols-12 lg:grid-rows-2">
              <BlurFade inView delay={0.05} direction="up" className="lg:col-span-7 lg:row-span-2">
                <div className="relative flex h-full min-h-[280px] flex-col justify-between overflow-hidden rounded-2xl bg-[#1a1025] p-8 text-white sm:p-10">
                  <div className="absolute -right-16 -bottom-20 size-64 rounded-full bg-[#c4a574]/15 blur-3xl" />
                  <div className="relative">
                    <Shield className="size-8 text-[#e8d5a8]" />
                    <h3 className="mt-5 text-2xl font-bold tracking-tight">An toàn & hỗ trợ 24/7</h3>
                    <p className="mt-3 max-w-[42ch] text-sm leading-relaxed text-stone-300">
                      Bảo hiểm đầy đủ. Đội kỹ thuật sẵn sàng cứu hộ trên mọi cung đường quanh Huế và
                      liên tỉnh.
                    </p>
                  </div>
                  <div className="relative mt-8 flex flex-wrap gap-6 text-sm text-stone-300">
                    <span className="inline-flex items-center gap-2">
                      <Clock className="size-4 text-[#e8d5a8]" />
                      Luôn sẵn sàng
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <MapPin className="size-4 text-[#e8d5a8]" />
                      Giao trung tâm miễn phí
                    </span>
                  </div>
                </div>
              </BlurFade>

              <BlurFade inView delay={0.1} direction="up" className="lg:col-span-5">
                <div className="h-full rounded-2xl border border-stone-200 bg-white p-7 shadow-sm">
                  <Car className="size-7 text-[#5b2d8e]" />
                  <h3 className="mt-4 text-lg font-bold text-[#1a1025]">Đội xe đa dạng</h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-600">
                    Sedan, SUV 5–7 chỗ, VinFast điện — chọn đúng nhu cầu chuyến đi.
                  </p>
                </div>
              </BlurFade>

              <BlurFade inView delay={0.15} direction="up" className="lg:col-span-5">
                <div className="h-full rounded-2xl border border-stone-200 bg-white p-7 shadow-sm">
                  <CheckCircle className="size-7 text-[#5b2d8e]" />
                  <h3 className="mt-4 text-lg font-bold text-[#1a1025]">Giá minh bạch</h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-600">
                    Đã gồm bảo hiểm cơ bản. Báo giá rõ trước khi nhận xe — không phát sinh ẩn.
                  </p>
                </div>
              </BlurFade>
            </div>
          </div>
        </section>

        <section id="fleet" className="scroll-mt-24 bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <BlurFade inView direction="up" offset={12}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="max-w-xl">
                  <p className="text-sm font-semibold tracking-wide text-[#5b2d8e]">
                    Bảng giá tham khảo
                  </p>
                  <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#1a1025] sm:text-4xl">
                    Đội xe sẵn sàng cho mọi lộ trình
                  </h2>
                  <p className="mt-3 text-base text-stone-600">
                    Giá đã gồm bảo hiểm cơ bản. Thuê dài ngày hoặc có tài xế — gọi để tư vấn.
                  </p>
                </div>
                <a
                  href="#booking"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#5b2d8e] hover:text-[#4a2474]"
                >
                  Kiểm tra xe trống
                  <ArrowRight className="size-4" />
                </a>
              </div>
            </BlurFade>

            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {FLEET.map((car, i) => (
                <BlurFade key={car.name} inView delay={0.06 * i} direction="up">
                  <article
                    className={cn(
                      "group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-white",
                      car.featured
                        ? "border-[#5b2d8e]/25 shadow-md shadow-[#5b2d8e]/8"
                        : "border-stone-200 shadow-sm"
                    )}
                  >
                    {car.featured ? (
                      <BorderBeam
                        size={90}
                        duration={8}
                        borderWidth={1.5}
                        colorFrom="#5b2d8e"
                        colorTo="#c4a574"
                      />
                    ) : null}

                    <div className="relative aspect-[16/10] overflow-hidden bg-stone-100">
                      <Image
                        src={car.image}
                        alt={car.alt}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    </div>

                    <div className="flex flex-1 flex-col p-5">
                      <p className="text-xs font-medium tracking-wide text-[#5b2d8e]">{car.tag}</p>
                      <h3 className="mt-1 text-lg font-bold text-[#1a1025]">{car.name}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-stone-600">{car.blurb}</p>
                      <ul className="mt-3 space-y-1.5 text-xs text-stone-600">
                        {car.points.map((p) => (
                          <li key={p} className="flex items-center gap-2">
                            <Check className="size-3.5 text-[#5b2d8e]" />
                            {p}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-auto flex items-end justify-between border-t border-stone-100 pt-4">
                        <div>
                          <p className="text-xs text-stone-500">Giá từ</p>
                          <p className="text-lg font-bold tabular-nums text-[#1a1025]">
                            {car.price.toLocaleString("vi-VN")}đ
                            <span className="text-sm font-medium text-stone-500"> / ngày</span>
                          </p>
                        </div>
                        <a
                          href="#booking"
                          className="rounded-xl bg-[#1a1025] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#5b2d8e]"
                        >
                          Đặt xe
                        </a>
                      </div>
                    </div>
                  </article>
                </BlurFade>
              ))}
            </div>
          </div>
        </section>

        <section id="process" className="scroll-mt-24 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <BlurFade inView direction="up">
              <div className="max-w-xl">
                <p className="text-sm font-semibold tracking-wide text-[#5b2d8e]">Quy trình</p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#1a1025] sm:text-4xl">
                  Ba bước — từ form đến vô lăng
                </h2>
              </div>
            </BlurFade>

            <ol className="mt-12 grid gap-6 md:grid-cols-3">
              {PROCESS_STEPS.map((item, i) => (
                <BlurFade key={item.step} inView delay={0.08 * i} direction="up">
                  <li className="relative rounded-2xl border border-stone-200 bg-white p-6">
                    <span className="font-mono text-3xl font-bold tracking-tighter text-[#5b2d8e]/15">
                      {item.step}
                    </span>
                    <h3 className="mt-3 text-lg font-bold text-[#1a1025]">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-stone-600">{item.body}</p>
                  </li>
                </BlurFade>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <footer id="contact" className="scroll-mt-24 border-t border-[#2a1a3d] bg-[#1a1025] text-stone-300">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8">
          <div className="space-y-3">
            <p className="text-xl font-bold tracking-tight text-white">Lavie Car Rental</p>
            <p className="max-w-[36ch] text-sm leading-relaxed text-stone-400">
              Cho thuê ô tô tự lái và có lái tại Huế — city tour, sân bay, hợp đồng du lịch liên
              tỉnh.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold tracking-wide text-white">Liên hệ</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0 text-[#e8d5a8]" />
                <span>
                  Lô 25, đường số 8, KQH Đông Nam Thuỷ An, phường Thanh Thuỷ, thành phố Huế
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <PhoneCall className="size-4 shrink-0 text-[#e8d5a8]" />
                <span>0363.077.775 · 0981.323.653</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Facebook className="size-4 shrink-0 text-[#e8d5a8]" />
                <a
                  href="https://facebook.com/thuexeototulaihue"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white hover:underline"
                >
                  fb.com/thuexeototulaihue
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold tracking-wide text-white">Khi thuê xe</h3>
            <ul className="space-y-2 text-sm text-stone-400">
              <li>CCCD và GPLX hợp lệ</li>
              <li>Đặt cọc tài sản hoặc tiền mặt</li>
              <li>Giao nhận miễn phí trung tâm</li>
              <li>Cứu hộ 24/7 khi sự cố</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-stone-500 sm:flex-row sm:px-6 lg:px-8">
            <p>© 2026 Lavie Car Rental — Phan Lê Tự Lập</p>
            <p className="text-stone-600">Giá minh bạch · Bảo hiểm đầy đủ</p>
          </div>
        </div>
      </footer>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a1025]/65 p-4 backdrop-blur-sm">
          <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-[#1a1025] px-6 py-5 text-white">
              <div>
                <h3 className="text-lg font-bold">Xe trống</h3>
                <p className="mt-1 text-xs text-stone-300">
                  {new Date(formData.startDate).toLocaleDateString("vi-VN")} →{" "}
                  {new Date(formData.endDate).toLocaleDateString("vi-VN")} ({totalDays} ngày)
                </p>
              </div>
              <button
                type="button"
                onClick={closeBookingModal}
                className="flex size-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
                aria-label="Đóng"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-6">
              {bookingSuccess ? (
                <div className="mx-auto max-w-md space-y-4 py-10 text-center">
                  <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100">
                    <Check className="size-8 text-emerald-600" />
                  </div>
                  <h4 className="text-2xl font-bold text-[#1a1025]">Đặt xe thành công</h4>
                  <p className="text-sm leading-relaxed text-stone-600">
                    Chào <span className="font-semibold text-[#1a1025]">{formData.name}</span>. Chúng
                    tôi đã nhận yêu cầu thuê{" "}
                    <span className="font-semibold text-[#1a1025]">{selectedVehicle?.name}</span>.
                  </p>
                  <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-900">
                    Lavie Car sẽ gọi <strong>{formData.phone}</strong> trong 10–15 phút để hoàn tất
                    và giao xe.
                  </p>
                  <Button
                    onClick={closeBookingModal}
                    className="rounded-xl bg-[#5b2d8e] px-8 text-white hover:bg-[#4a2474]"
                  >
                    Đóng
                  </Button>
                </div>
              ) : availableVehicles.length === 0 ? (
                <div className="space-y-3 py-14 text-center text-stone-500">
                  <Car className="mx-auto size-14 opacity-30" />
                  <p className="text-lg font-medium text-stone-700">
                    Hiện chưa có xe trống trong khoảng này
                  </p>
                  <p className="mx-auto max-w-sm text-sm">
                    Đổi ngày nhận/trả hoặc gọi hotline để được sắp xếp trực tiếp.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-stone-100">
                  {availableVehicles.map((vehicle) => {
                    const priceTotal = totalDays * vehicle.pricePerDay
                    return (
                      <div
                        key={vehicle.id}
                        className="flex flex-col justify-between gap-4 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex size-14 items-center justify-center rounded-2xl border border-stone-200 bg-stone-50 text-[#5b2d8e]">
                            <Car className="size-7" />
                          </div>
                          <div>
                            <h4 className="font-bold text-stone-900">{vehicle.name}</h4>
                            <p className="mt-0.5 text-xs text-stone-500">
                              Màu: <strong>{vehicle.color || "Nhiều màu"}</strong>
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 sm:items-end">
                          <div className="text-left sm:text-right">
                            <span className="block text-xs text-stone-500">
                              {vehicle.pricePerDay.toLocaleString("vi-VN")}đ/ngày
                            </span>
                            <span className="block text-base font-bold tabular-nums text-[#1a1025]">
                              Tổng {priceTotal.toLocaleString("vi-VN")}đ
                            </span>
                          </div>
                          <Button
                            onClick={() => handleConfirmBooking(vehicle)}
                            disabled={isSubmitting}
                            className="h-9 rounded-xl bg-[#5b2d8e] px-4 text-xs font-semibold text-white hover:bg-[#4a2474]"
                          >
                            {isSubmitting && selectedVehicle?.id === vehicle.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              "Xác nhận đặt xe"
                            )}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="fixed right-5 bottom-5 z-50 flex flex-col items-end gap-3">
        {isOpenContact && (
          <div className="mb-1 flex flex-col items-end gap-2.5">
            <a
              href="https://zalo.me/0363077775"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full bg-[#0068ff] px-4 py-2.5 text-white shadow-lg transition-transform hover:scale-[1.02]"
            >
              <span className="text-xs font-semibold">Chat Zalo</span>
              <MessageCircle className="size-4" />
            </a>
            <a
              href="https://facebook.com/thuexeototulaihue"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full bg-[#1a1025] px-4 py-2.5 text-white shadow-lg transition-transform hover:scale-[1.02]"
            >
              <span className="text-xs font-semibold">Facebook</span>
              <Facebook className="size-4" />
            </a>
            <a
              href="tel:0363077775"
              className="flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-white shadow-lg transition-transform hover:scale-[1.02]"
            >
              <span className="text-xs font-semibold">0363.077.775</span>
              <PhoneCall className="size-4" />
            </a>
            <a
              href="tel:0981323653"
              className="flex items-center gap-2 rounded-full bg-[#c4a574] px-4 py-2.5 text-[#1a1025] shadow-lg transition-transform hover:scale-[1.02]"
            >
              <span className="text-xs font-semibold">0981.323.653</span>
              <PhoneCall className="size-4" />
            </a>
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsOpenContact(!isOpenContact)}
          aria-label="Liên hệ hotline và mạng xã hội"
          className={cn(
            "flex size-14 items-center justify-center rounded-full text-white shadow-2xl transition-transform hover:scale-105 active:scale-95",
            isOpenContact ? "bg-rose-500" : "bg-[#5b2d8e]"
          )}
        >
          {isOpenContact ? <X className="size-6" /> : <PhoneCall className="size-6" />}
        </button>
      </div>
    </div>
  )
}
