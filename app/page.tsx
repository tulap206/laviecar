"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase, fetchVehicles, fetchRentals, fetchCustomers, insertCustomer, insertRental } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Car, Calendar, User, Phone, MapPin, Facebook, 
  Shield, Clock, Star, CheckCircle, ArrowRight, 
  Menu, X, HelpCircle, PhoneCall, Check, Loader2, MessageCircle, Zap 
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"

export default function LandingPage() {
  const router = useRouter()
  
  // Form booking states
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    facebook: "",
    address: "",
    startDate: "",
    endDate: "",
  })
  
  // Search & loading states
  const [activeCategory, setActiveCategory] = useState<"bike" | "car" | "electric">("bike")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [availableVehicles, setAvailableVehicles] = useState<any[]>([])
  const [totalDays, setTotalDays] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [bookingSuccess, setBookingSuccess] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null)
  const [isOpenContact, setIsOpenContact] = useState(false)
  
  // Calculate total rental days
  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate)
      const end = new Date(formData.endDate)
      if (start <= end) {
        const diffTime = Math.abs(end.getTime() - start.getTime())
        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        setTotalDays(days === 0 ? 1 : days) // Minimum 1 day
      } else {
        setTotalDays(0)
      }
    } else {
      setTotalDays(0)
    }
  }, [formData.startDate, formData.endDate])

  // Fetch available vehicles that don't conflict with current rentals
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.phone || !formData.startDate || !formData.endDate) {
      alert("Vui lòng nhập đầy đủ họ tên, số điện thoại và thời gian thuê xe!")
      return
    }

    const start = new Date(formData.startDate)
    const end = new Date(formData.endDate)
    if (start > end) {
      alert("Ngày nhận xe phải trước hoặc trùng ngày trả xe!")
      return
    }

    setIsLoading(true)
    try {
      const [vehicles, rentals] = await Promise.all([
        fetchVehicles(),
        fetchRentals()
      ])

      // Find conflicting vehicles in selected date range
      const conflictingVehicleIds = new Set(
        rentals
          .filter((rental: any) => {
            if (rental.status === "cancelled") return false
            
            // Convert dd/mm/yyyy from Supabase to Date objects
            const parseDate = (dStr: string) => {
              const parts = dStr.split('/')
              return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]))
            }
            
            const rStart = parseDate(rental.startDate)
            const rEnd = parseDate(rental.endDate)
            
            return !(end < rStart || start > rEnd)
          })
          .map((rental: any) => rental.vehicleId)
      )

      // Filter vehicles that are available and have no conflicts
      const available = vehicles.filter((vehicle: any) => {
        const matchesStatus = vehicle.status === "available" && !conflictingVehicleIds.has(vehicle.id)
        if (!matchesStatus) return false
        
        if (activeCategory === "bike") {
          return vehicle.category === "bike"
        } else if (activeCategory === "car") {
          // Normal cars, exclude electric models
          return vehicle.category === "car" && !vehicle.name.toLowerCase().includes("vf3") && !vehicle.name.toLowerCase().includes("vf5")
        } else if (activeCategory === "electric") {
          // Electric models (like VF3, VF5, or any model with 'điện' in the name)
          return vehicle.category === "car" && (vehicle.name.toLowerCase().includes("vf3") || vehicle.name.toLowerCase().includes("vf5") || vehicle.name.toLowerCase().includes("điện"))
        }
        return true
      })

      setAvailableVehicles(available)
      setIsModalOpen(true)
    } catch (error) {
      console.error("Lỗi khi tìm xe:", error)
      alert("Đã xảy ra lỗi khi tìm kiếm xe trống. Vui lòng thử lại!")
    } finally {
      setIsLoading(false)
    }
  }

  // Handle final booking submission
  const handleConfirmBooking = async (vehicle: any) => {
    setSelectedVehicle(vehicle)
    setIsSubmitting(true)
    try {
      // 1. Fetch current customers to see if customer already exists (by phone)
      const customersList = await fetchCustomers()
      let customer = customersList.find((c: any) => c.phone === formData.phone)
      let customerId = ""

      if (customer) {
        customerId = customer.id
      } else {
        // Create new customer
        const newCustomer = await insertCustomer({
          name: formData.name,
          phone: formData.phone,
          facebook: formData.facebook || "",
          address: formData.address || "",
          idcard: "",
          totalrentals: 0,
          status: "active",
          customerphoto: [],
          cccdfront: [],
          cccdback: [],
          licensefront: [],
          licenseback: []
        })
        customerId = newCustomer.id
      }

      // 2. Format dates to dd/mm/yyyy
      const formatDateStr = (dateInput: string) => {
        const d = new Date(dateInput)
        const day = String(d.getDate()).padStart(2, '0')
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const year = d.getFullYear()
        return `${day}/${month}/${year}`
      }

      const formattedStart = formatDateStr(formData.startDate)
      const formattedEnd = formatDateStr(formData.endDate)
      const totalPrice = totalDays * vehicle.pricePerDay

      // 3. Insert new rental
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
        deposit: 0, // Admin will set deposit on approval
        extraFees: 0,
        notes: "Khách đặt trực tuyến từ website",
        revenue: 0,
        status: "pending"
      })

      setBookingSuccess(true)
    } catch (error) {
      console.error("Lỗi khi đặt xe:", error)
      alert("Đã xảy ra lỗi khi gửi yêu cầu đặt xe. Vui lòng liên hệ hotline!")
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
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-red-600 selection:text-white">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-red-100/50 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 relative rounded-full overflow-hidden flex-shrink-0 drop-shadow-md">
              <Image 
                src="/logo.jpg?v=5"
                alt="QUÝ 79 Logo" 
                fill
                priority
                className="object-cover"
                onError={(e) => {
                  const target = e.target as HTMLElement;
                  target.style.display = 'none';
                }}
              />
            </div>
            <div>
              <span className="text-2xl sm:text-3xl font-black italic tracking-tighter font-sans bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent uppercase">
                QUÝ <span className="text-amber-500">79</span>
              </span>
              <span className="block text-[10px] text-red-600 font-semibold tracking-widest uppercase">Cho Thuê - Mua Bán - Cầm Cố Xe Máy - Ô Tô</span>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#booking" className="hover:text-red-600 transition-colors">Đặt Xe</a>
            <a href="#pricing" className="hover:text-red-600 transition-colors">Báo Giá</a>
            <a href="#about" className="hover:text-red-600 transition-colors">Về Chúng Tôi</a>
            <a href="#process" className="hover:text-red-600 transition-colors">Quy Trình</a>
            <a href="#contact" className="hover:text-red-600 transition-colors">Liên Hệ</a>
          </nav>

          <div className="flex items-center gap-4">
            <Link 
              href="/login"
              className="px-5 py-2.5 rounded-xl border border-red-200 hover:border-red-600 hover:text-red-600 transition-all font-semibold text-sm flex items-center gap-2 hover:shadow-sm"
            >
              <User className="w-4 h-4" />
              <span>Đăng nhập</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section & Booking Form */}
      <section 
        className="relative min-h-[85vh] flex items-center justify-center py-12 sm:py-20 overflow-hidden text-white bg-no-repeat"
        style={{
          backgroundImage: 'url(/hue-car-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Background Overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-900/95 via-slate-950/90 to-red-950/80 z-0" />
        {/* Subtle royal pattern indicator using radial gradient */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-700/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-600/5 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Hero text (7 columns) */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-800/60 border border-red-500/30 text-amber-300 text-xs font-semibold uppercase tracking-wider">
              <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
              Cho thuê — Mua bán — Cầm cố xe máy & ô tô uy tín tại Huế
            </span>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black font-serif leading-tight text-white uppercase">
              <span className="block">QUÝ 79</span>
              <span className="block bg-gradient-to-r from-amber-400 via-red-300 to-amber-300 bg-clip-text text-transparent text-xl sm:text-2xl lg:text-3xl mt-2 tracking-wide font-sans normal-case italic">“Trao chìa khóa - kết nối hành trình”</span>
            </h1>
            <p className="text-lg text-slate-300 max-w-xl mx-auto lg:mx-0 leading-relaxed font-light">
              Cửa hàng Quý 79 chuyên dịch vụ Cho thuê - Mua bán - Cầm cố các loại xe máy (xe số, xe ga đời mới) và ô tô tự lái chất lượng cao tại Huế. Thủ tục đơn giản, phục vụ tận tâm, hỗ trợ 24/7.
            </p>
            
            <div className="hidden lg:flex items-center gap-6 pt-4 text-sm text-red-300">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-400" />
                <span>Bảo hiểm đầy đủ</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                <span>Hỗ trợ 24/7</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-amber-400" />
                <span>Giá tốt nhất Huế</span>
              </div>
            </div>
          </div>

          {/* Booking Form (5 columns) */}
          <div id="booking" className="lg:col-span-5 bg-white text-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-red-100 hover:shadow-red-900/10 transition-all duration-300">
            <h2 className="text-2xl font-bold text-red-950 font-serif text-center mb-6">
              Đặt xe trực tuyến
            </h2>
            
            <form onSubmit={handleSearch} className="space-y-4">
              {/* Category Tabs */}
              <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-2xl mb-3 border border-slate-200/50">
                <button
                  type="button"
                  onClick={() => setActiveCategory("bike")}
                  className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                    activeCategory === "bike" 
                      ? "bg-red-600 text-white shadow-sm" 
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Xe máy
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory("car")}
                  className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                    activeCategory === "car" 
                      ? "bg-red-600 text-white shadow-sm" 
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Xe ô tô
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory("electric")}
                  className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                    activeCategory === "electric" 
                      ? "bg-red-600 text-white shadow-sm" 
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Xe điện
                </button>
              </div>

              {activeCategory === "electric" ? (
                <div className="py-12 px-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center space-y-4 my-4">
                  <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-600 animate-pulse">
                    <Zap className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-red-950 font-serif">Coming Soon...</h3>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                    Dịch vụ cho thuê xe điện thông minh đang được chuẩn bị và sẽ sớm ra mắt quý khách tại Cố đô Huế.
                  </p>
                  <div className="pt-2 text-xs font-semibold text-red-600">
                    Hotline liên hệ: 0762.75.3333
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <Label htmlFor="name" className="text-xs font-semibold text-slate-500 uppercase">Họ và tên *</Label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-red-600/60" />
                      <Input 
                        id="name"
                        type="text"
                        required
                        placeholder="Nguyễn Văn A"
                        className="pl-11 h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-red-600 focus:ring-red-600/20 rounded-xl transition-all"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="phone" className="text-xs font-semibold text-slate-500 uppercase">Số điện thoại *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-red-600/60" />
                      <Input 
                        id="phone"
                        type="tel"
                        required
                        placeholder="0762 75 3333"
                        className="pl-11 h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-red-600 focus:ring-red-600/20 rounded-xl transition-all"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="startDate" className="text-xs font-semibold text-slate-500 uppercase">Ngày nhận *</Label>
                      <Input 
                        id="startDate"
                        type="date"
                        required
                        className="h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-red-600 focus:ring-red-600/20 rounded-xl text-sm"
                        value={formData.startDate}
                        onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="endDate" className="text-xs font-semibold text-slate-500 uppercase">Ngày trả *</Label>
                      <Input 
                        id="endDate"
                        type="date"
                        required
                        className="h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-red-600 focus:ring-red-600/20 rounded-xl text-sm"
                        value={formData.endDate}
                        onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="address" className="text-xs font-semibold text-slate-500 uppercase">Địa chỉ (tại Huế hoặc nơi ở)</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-red-600/60" />
                      <Input 
                        id="address"
                        type="text"
                        placeholder="Khách sạn Hương Giang, Lê Lợi, Huế"
                        className="pl-11 h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-red-600 focus:ring-red-600/20 rounded-xl transition-all"
                        value={formData.address}
                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-lg shadow-red-900/20 font-semibold transition-all mt-4 hover-lift"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Đang tìm kiếm...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        Tìm Xe Trống & Báo Giá
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </Button>
                </>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* About Section - Red/Black Theme */}
      <section id="about" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-red-600 font-bold uppercase tracking-wider text-sm block">Đặc Quyền Của Bạn</span>
            <h2 className="text-3xl sm:text-4xl font-bold font-serif text-red-950">
              Tại sao nên chọn dịch vụ tại Quý 79?
            </h2>
            <div className="w-20 h-1 bg-red-600 mx-auto rounded-full mt-4" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-red-50/20 border border-red-100 hover:shadow-xl transition-all duration-300 space-y-4 group">
              <div className="w-14 h-14 bg-red-950 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Car className="w-7 h-7 text-amber-300" />
              </div>
              <h3 className="text-xl font-bold text-red-950 font-serif">Giá Cả Cạnh Tranh</h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                Cam kết mang lại mức giá tốt nhất cho xe máy chỉ từ 100k/ngày, ô tô tự lái chỉ từ 500k/ngày. Không phát sinh chi phí phụ.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-red-50/20 border border-red-100 hover:shadow-xl transition-all duration-300 space-y-4 group">
              <div className="w-14 h-14 bg-red-950 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Shield className="w-7 h-7 text-amber-300" />
              </div>
              <h3 className="text-xl font-bold text-red-950 font-serif">Dịch Vụ Đa Dạng</h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                Không chỉ cho thuê xe, Quý 79 còn hỗ trợ Mua bán và Cầm cố các loại phương tiện với thủ tục nhanh gọn, bảo mật thông tin.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-red-50/20 border border-red-100 hover:shadow-xl transition-all duration-300 space-y-4 group">
              <div className="w-14 h-14 bg-red-950 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <MapPin className="w-7 h-7 text-amber-300" />
              </div>
              <h3 className="text-xl font-bold text-red-950 font-serif">Hỗ Trợ Tận Tâm 24/7</h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                Giao xe tận nơi miễn phí trung tâm Huế. Đội ngũ nhân viên luôn sẵn sàng đồng hành cùng bạn trên mọi nẻo đường.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-slate-50 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-red-600 font-bold uppercase tracking-wider text-sm block">Bảng Giá Công Khai</span>
            <h2 className="text-3xl sm:text-4xl font-bold font-serif text-red-950">Bảng Giá Thuê Xe Chi Tiết</h2>
            <p className="text-slate-600">Cam kết không chi phí ẩn, thủ tục minh bạch, hỗ trợ tối đa</p>
            <div className="w-20 h-1 bg-red-600 mx-auto rounded-full mt-4" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {/* Xe Số */}
            <div className="bg-white rounded-3xl p-5 shadow-md border border-slate-100 flex flex-col justify-between hover:shadow-xl hover:border-red-100 transition-all duration-300">
              <div>
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden mb-4 bg-slate-100 border border-slate-100">
                  <Image 
                    src="/xe-so.jpg"
                    alt="Xe Số"
                    fill
                    loading="eager"
                    className="object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-bold text-slate-800 font-serif">Xe Số</h3>
                  <span className="bg-red-50 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Xe máy</span>
                </div>
                <div className="space-y-1 mb-4 bg-slate-50 p-3 rounded-xl">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Dòng xe hiện có:</span>
                  <p className="text-slate-700 text-xs font-semibold leading-relaxed">Wave Alpha — Yamaha Sirius — Yamaha PG1</p>
                </div>
                <ul className="text-xs text-slate-500 space-y-2 pt-1 border-t border-slate-100/50">
                  <li className="flex items-center gap-1.5">✓ Tiết kiệm xăng vượt trội</li>
                  <li className="flex items-center gap-1.5">✓ Linh hoạt, dễ di chuyển</li>
                </ul>
              </div>
              <div className="mt-6">
                <div className="flex items-baseline justify-between mb-3">
                  <span className="text-slate-400 text-xs">Giá thuê:</span>
                  <div className="text-right">
                    <span className="text-lg font-black text-red-600">100k - 130k</span>
                    <span className="text-slate-400 text-[10px] ml-0.5">/ngày</span>
                  </div>
                </div>
                <a href="#booking" className="block w-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-3 rounded-xl text-center transition-colors shadow-sm">Đặt Xe Ngay</a>
              </div>
            </div>

            {/* Xe Ga */}
            <div className="bg-white rounded-3xl p-5 shadow-md border border-slate-100 flex flex-col justify-between hover:shadow-xl hover:border-red-100 transition-all duration-300">
              <div>
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden mb-4 bg-slate-100 border border-slate-100">
                  <Image 
                    src="/xe-ga.jpg"
                    alt="Xe Ga"
                    fill
                    loading="eager"
                    className="object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-bold text-slate-800 font-serif">Xe Ga</h3>
                  <span className="bg-red-50 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Xe máy</span>
                </div>
                <div className="space-y-1 mb-4 bg-slate-50 p-3 rounded-xl">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Dòng xe hiện có:</span>
                  <p className="text-slate-700 text-xs font-semibold leading-relaxed">Airblade — Lead — Vision — Freego — SH</p>
                </div>
                <ul className="text-xs text-slate-500 space-y-2 pt-1 border-t border-slate-100/50">
                  <li className="flex items-center gap-1.5">✓ Cốp rộng rãi, tiện nghi</li>
                  <li className="flex items-center gap-1.5">✓ Đa dạng phân khúc lựa chọn</li>
                </ul>
              </div>
              <div className="mt-6">
                <div className="flex items-baseline justify-between mb-3">
                  <span className="text-slate-400 text-xs">Giá thuê:</span>
                  <div className="text-right">
                    <span className="text-lg font-black text-red-600">120k - 250k</span>
                    <span className="text-slate-400 text-[10px] ml-0.5">/ngày</span>
                  </div>
                </div>
                <a href="#booking" className="block w-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-3 rounded-xl text-center transition-colors shadow-sm">Đặt Xe Ngay</a>
              </div>
            </div>

            {/* Ô Tô */}
            <div className="bg-white rounded-3xl p-5 shadow-md border border-slate-100 flex flex-col justify-between hover:shadow-xl hover:border-red-100 transition-all duration-300">
              <div>
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden mb-4 bg-slate-100 border border-slate-100">
                  <Image 
                    src="/xe-oto-xang.jpg"
                    alt="Ô Tô Tự Lái"
                    fill
                    loading="eager"
                    className="object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-bold text-slate-800 font-serif">Ô Tô Xăng</h3>
                  <span className="bg-red-50 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Tự lái</span>
                </div>
                <div className="space-y-1 mb-4 bg-slate-50 p-3 rounded-xl">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Dòng xe hiện có:</span>
                  <p className="text-slate-700 text-xs font-semibold leading-relaxed">Mazda 3 — MG5 — Honda Civic — Vios — Accent</p>
                </div>
                <ul className="text-xs text-slate-500 space-y-2 pt-1 border-t border-slate-100/50">
                  <li className="flex items-center gap-1.5">✓ Xe đời mới sạch sẽ, tiện nghi</li>
                  <li className="flex items-center gap-1.5">✓ Đầy đủ bảo hiểm tự nguyện</li>
                </ul>
              </div>
              <div className="mt-6">
                <div className="flex items-baseline justify-between mb-3">
                  <span className="text-slate-400 text-xs">Giá thuê:</span>
                  <div className="text-right">
                    <span className="text-lg font-black text-red-600">500k - 1.0M</span>
                    <span className="text-slate-400 text-[10px] ml-0.5">/ngày</span>
                  </div>
                </div>
                <a href="#booking" className="block w-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-3 rounded-xl text-center transition-colors shadow-sm">Đặt Xe Ngay</a>
              </div>
            </div>

            {/* Xe Điện */}
            <div className="bg-white rounded-3xl p-5 shadow-md border border-slate-100 flex flex-col justify-between hover:shadow-xl hover:border-red-100 transition-all duration-300 opacity-95 relative overflow-hidden">
              <div className="absolute top-2.5 right-2.5 z-10">
                <span className="bg-amber-100 text-amber-800 text-[9px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider">Sắp Ra Mắt</span>
              </div>
              <div>
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden mb-4 bg-slate-100 border border-slate-100">
                  <Image 
                    src="/xe-dien.jpg"
                    alt="Xe Điện"
                    fill
                    loading="eager"
                    className="object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-bold text-slate-800 font-serif">Xe Điện</h3>
                  <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Xu hướng</span>
                </div>
                <div className="space-y-1 mb-4 bg-slate-50 p-3 rounded-xl">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Dòng xe dự kiến:</span>
                  <p className="text-slate-700 text-xs font-semibold leading-relaxed">VinFast VF3 — VinFast VF5 — VinFast VF e34</p>
                </div>
                <ul className="text-xs text-slate-500 space-y-2 pt-1 border-t border-slate-100/50">
                  <li className="flex items-center gap-1.5">✓ Công nghệ xanh tiết kiệm điện</li>
                  <li className="flex items-center gap-1.5">✓ Vận hành êm ái thông minh</li>
                </ul>
              </div>
              <div className="mt-6">
                <div className="flex items-baseline justify-between mb-3">
                  <span className="text-slate-400 text-xs">Giá thuê dự kiến:</span>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-slate-400 italic">Coming soon</span>
                  </div>
                </div>
                <button disabled className="w-full bg-slate-100 text-slate-400 text-xs font-bold py-3 rounded-xl text-center cursor-not-allowed">Đang cập nhật</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Process, Commitments & Payments Section */}
      <section id="process" className="py-20 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-red-600 font-bold uppercase tracking-wider text-sm block">Quy Trình & Hợp Tác</span>
            <h2 className="text-3xl sm:text-4xl font-bold font-serif text-red-950">Quy Trình Thuê Xe & Thanh Toán</h2>
            <div className="w-20 h-1 bg-red-600 mx-auto rounded-full mt-4" />
          </div>

          {/* 3 Steps - Top Part */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="bg-slate-50 rounded-3xl p-8 text-center space-y-4 shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300">
              <div className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center font-black text-lg mx-auto shadow-md">
                1
              </div>
              <h3 className="text-lg font-bold text-slate-800 font-serif">Đăng Ký Đặt Xe</h3>
              <p className="text-slate-500 text-xs leading-relaxed">
                Nhập thông tin cá nhân và thời gian thuê xe ngay tại form đặt xe trực tuyến phía trên để bắt đầu.
              </p>
            </div>

            <div className="bg-slate-50 rounded-3xl p-8 text-center space-y-4 shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300">
              <div className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center font-black text-lg mx-auto shadow-md">
                2
              </div>
              <h3 className="text-lg font-bold text-slate-800 font-serif">Xác Nhận & Giao Xe Tận Nơi</h3>
              <p className="text-slate-500 text-xs leading-relaxed">
                Hệ thống xác nhận và nhân viên sẽ liên hệ giao xe tận nơi (khách sạn, nhà riêng, sân bay) nhanh chóng.
              </p>
            </div>

            <div className="bg-slate-50 rounded-3xl p-8 text-center space-y-4 shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300">
              <div className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center font-black text-lg mx-auto shadow-md">
                3
              </div>
              <h3 className="text-lg font-bold text-slate-800 font-serif">Khám Phá & Trả Xe</h3>
              <p className="text-slate-500 text-xs leading-relaxed">
                Thoải mái vi vu dạo quanh Cố đô Huế xinh đẹp và trả xe thuận tiện tại điểm hẹn đã thỏa thuận.
              </p>
            </div>
          </div>

          {/* Commitments & QR Payment - Bottom Part */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Offers & Commitments Card */}
            <div className="bg-slate-50 rounded-3xl p-8 sm:p-10 shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 space-y-6">
              <div>
                <h3 className="text-xl font-bold text-red-950 font-serif">Ưu Đãi & Cam Kết Từ Quý 79</h3>
                <p className="text-xs text-slate-500 mt-1">Chúng tôi luôn đặt lợi ích và trải nghiệm của khách hàng lên hàng đầu</p>
                <div className="w-12 h-0.5 bg-red-500 mt-3" />
              </div>
              
              <ul className="space-y-4">
                <li className="flex gap-3.5">
                  <div className="w-5 h-5 rounded-full bg-red-100 flex-shrink-0 flex items-center justify-center mt-0.5">
                    <Check className="w-3.5 h-3.5 text-red-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Xe Máy & Ô Tô Đời Mới</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Sạch sẽ, được bảo dưỡng định kỳ và kiểm tra kỹ lưỡng trước khi bàn giao cho quý khách.</p>
                  </div>
                </li>
                <li className="flex gap-3.5">
                  <div className="w-5 h-5 rounded-full bg-red-100 flex-shrink-0 flex items-center justify-center mt-0.5">
                    <Check className="w-3.5 h-3.5 text-red-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Giao Nhận Tận Nơi Miễn Phí</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Giao xe miễn phí tại khu vực trung tâm thành phố Huế và các điểm lân cận.</p>
                  </div>
                </li>
                <li className="flex gap-3.5">
                  <div className="w-5 h-5 rounded-full bg-red-100 flex-shrink-0 flex items-center justify-center mt-0.5">
                    <Check className="w-3.5 h-3.5 text-red-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Giá Cả Cạnh Tranh & Minh Bạch</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Giá thuê xe rõ ràng, không có phí ẩn hay phát sinh bất kỳ khoản phụ thu ngoài hợp đồng nào.</p>
                  </div>
                </li>
                <li className="flex gap-3.5">
                  <div className="w-5 h-5 rounded-full bg-red-100 flex-shrink-0 flex items-center justify-center mt-0.5">
                    <Check className="w-3.5 h-3.5 text-red-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Hỗ Trợ Kỹ Thuật 24/7</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Đội ngũ kỹ thuật hỗ trợ tận tình suốt 24h, xử lý sự cố nhanh chóng mọi lúc mọi nơi.</p>
                  </div>
                </li>
              </ul>
            </div>

            {/* QR Payment Card */}
            <div className="bg-slate-50 rounded-3xl p-8 sm:p-10 shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 flex flex-col md:flex-row items-center gap-8">
              <div className="w-full md:w-1/2 flex flex-col items-center justify-center bg-white p-6 rounded-2xl border border-dashed border-slate-200">
                <div className="w-48 h-48 relative bg-white p-2 rounded-xl shadow-sm border border-slate-100">
                  <Image 
                    src="/payment-qr.png" 
                    alt="Mã QR Thanh Toán Quý 79"
                    fill
                    className="object-contain"
                  />
                </div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-4">Quét mã để chuyển khoản</span>
              </div>

              <div className="w-full md:w-1/2 space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-red-950 font-serif">Thanh Toán</h3>
                  <p className="text-xs text-slate-500 mt-1">Đơn giản, bảo mật và cực kỳ nhanh chóng qua ngân hàng</p>
                  <div className="w-12 h-0.5 bg-red-500 mt-3" />
                </div>
                
                <div className="space-y-3.5 text-xs text-slate-600">
                  <p className="leading-relaxed">
                    Hỗ trợ quét QR thanh toán nhanh bằng mọi ứng dụng Mobile Banking trên điện thoại của quý khách để cọc giữ xe hoặc trả phí.
                  </p>
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Ngân hàng:</span>
                      <strong className="text-slate-700">VietinBank</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Số tài khoản:</span>
                      <strong className="text-slate-700 font-mono tracking-wider">0762753333</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Tên tài khoản:</span>
                      <strong className="text-slate-700">NGUYEN HOANG QUY</strong>
                    </div>
                  </div>
                  <p className="text-[10px] text-amber-600 bg-amber-50 p-2.5 rounded-lg font-medium">
                    * Lưu ý: Khi chuyển khoản quý khách vui lòng nhập nội dung là <strong>[Họ tên] [Số điện thoại]</strong> đăng ký thuê xe.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Contact Details */}
      <footer id="contact" className="bg-slate-900 text-slate-300 pt-16 pb-8 border-t border-red-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-12 pb-12 border-b border-slate-800">
          <div className="space-y-4">
            <span className="text-xl font-bold font-serif text-white tracking-wider">QUÝ 79 MOTO</span>
            <p className="text-sm text-slate-400 font-light leading-relaxed">
              Cửa hàng Quý 79 chuyên dịch vụ Cho Thuê - Mua Bán - Cầm Cố Xe Máy - Ô Tô uy tín, nhanh chóng, giá tốt hàng đầu tại Huế.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-white font-bold font-serif">Thông Tin Liên Hệ</h3>
            <ul className="space-y-3 text-sm font-light">
              <li className="flex items-start gap-2">
                <MapPin className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span>Cơ sở 1: 06 Nguyễn Trãi, TP Huế</span>
                  <span className="block">Cơ sở 2: 9/38 Hồ Đắc Di, TP Huế</span>
                </div>
              </li>
              <li className="flex items-center gap-2">
                <PhoneCall className="w-5 h-5 text-amber-400" />
                <span>Hotline: 0762 75 3333</span>
              </li>
              <li className="flex items-center gap-2">
                <Facebook className="w-5 h-5 text-amber-400" />
                <a href="https://www.facebook.com/profile.php?id=100057429789995" target="_blank" rel="noopener noreferrer" className="hover:underline">Facebook Page Quý 79</a>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-white font-bold font-serif">Chính Sách Cho Thuê</h3>
            <ul className="space-y-2 text-sm font-light">
              <li>• Yêu cầu CCCD và Giấy Phép Lái Xe hợp lệ</li>
              <li>• Đặt cọc tài sản hoặc tiền mặt khi nhận xe</li>
              <li>• Hỗ trợ giao nhận xe miễn phí trung tâm</li>
              <li>• Hỗ trợ cứu hộ 24/7 khẩn cấp</li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-slate-500 gap-4">
          <p>© 2026 Quý 79 Moto. Phát triển bởi Phan Lê Tự Lập.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:underline">Điều khoản dịch vụ</a>
            <a href="#" className="hover:underline">Chính sách bảo mật</a>
          </div>
        </div>
      </footer>

      {/* Available Vehicles Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 bg-red-950 text-white flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold font-serif">Danh Sách Xe Trống</h3>
                <p className="text-xs text-red-300 mt-1">
                  Từ ngày: <span className="font-semibold text-white">{new Date(formData.startDate).toLocaleDateString('vi-VN')}</span> đến ngày: <span className="font-semibold text-white">{new Date(formData.endDate).toLocaleDateString('vi-VN')}</span> ({totalDays} ngày)
                </p>
              </div>
              <button 
                onClick={closeBookingModal}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {bookingSuccess ? (
                <div className="py-12 text-center space-y-4 max-w-md mx-auto">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                    <Check className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h4 className="text-2xl font-bold text-red-950 font-serif">Đặt xe thành công!</h4>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Chào mừng bạn <span className="font-semibold text-red-950">{formData.name}</span>! Chúng tôi đã tiếp nhận yêu cầu thuê xe <span className="font-semibold text-red-950">{selectedVehicle?.name}</span> của bạn.
                  </p>
                  <p className="text-xs text-amber-600 font-semibold bg-amber-50 p-3 rounded-xl border border-amber-200">
                    Bộ phận hỗ trợ Quý 79 sẽ liên hệ trực tiếp với bạn qua số điện thoại <strong>{formData.phone}</strong> trong vòng 10-15 phút để hoàn tất thủ tục và giao xe!
                  </p>
                  <Button 
                    onClick={closeBookingModal}
                    className="bg-red-600 hover:bg-red-700 text-white px-8 rounded-xl"
                  >
                    Đóng cửa sổ
                  </Button>
                </div>
              ) : (
                <>
                  {availableVehicles.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 space-y-3">
                      <Car className="w-16 h-16 mx-auto opacity-30 animate-bounce" />
                      <p className="text-lg font-medium">Rất tiếc, hiện tại tất cả các xe đều bận trong thời gian này!</p>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">Vui lòng thay đổi khoảng thời gian nhận/trả xe hoặc liên hệ hotline để được hỗ trợ sắp xếp xe trực tiếp.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {availableVehicles.map((vehicle) => {
                        const priceTotal = totalDays * vehicle.pricePerDay
                        return (
                          <div key={vehicle.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center text-red-950 shadow-sm border border-red-100">
                                <Car className="w-8 h-8" />
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-800 text-base">{vehicle.name}</h4>
                                <div className="flex gap-3 text-xs text-slate-500 mt-1">
                                  <span>Màu sắc: <strong>{vehicle.color || "Nhiều màu"}</strong></span>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col sm:items-end justify-between gap-2 sm:gap-1">
                              <div className="text-left sm:text-right">
                                <span className="block text-xs text-slate-500">Đơn giá: {vehicle.pricePerDay.toLocaleString("vi-VN")}đ/ngày</span>
                                <span className="block text-base font-extrabold text-red-950">Tổng thanh toán: {priceTotal.toLocaleString("vi-VN")} VNĐ</span>
                              </div>
                              <Button
                                onClick={() => handleConfirmBooking(vehicle)}
                                disabled={isSubmitting}
                                className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs px-4 h-9 font-semibold"
                              >
                                {isSubmitting && selectedVehicle?.id === vehicle.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  "Xác Nhận Đặt Xe"
                                )}
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Contact Buttons */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {isOpenContact && (
          <div className="flex flex-col items-end gap-3 mb-2 animate-in slide-in-from-bottom-5 fade-in duration-200">
            {/* Zalo Button */}
            <a 
              href="https://zalo.me/0762753333" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-full shadow-lg transition-all transform hover:scale-105"
            >
              <span className="text-xs font-semibold">Chat Zalo</span>
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
            </a>

            {/* Facebook Button */}
            <a 
              href="https://www.facebook.com/profile.php?id=100057429789995" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-full shadow-lg transition-all transform hover:scale-105"
            >
              <span className="text-xs font-semibold">Facebook Page</span>
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Facebook className="w-4 h-4 text-white" />
              </div>
            </a>

            {/* Hotline */}
            <a 
              href="tel:0762753333" 
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-full shadow-lg transition-all transform hover:scale-105"
            >
              <span className="text-xs font-semibold">Hotline: 0762.75.3333</span>
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <PhoneCall className="w-4 h-4 text-white" />
              </div>
            </a>
          </div>
        )}

        {/* Main Floating Toggle Button */}
        <button
          onClick={() => setIsOpenContact(!isOpenContact)}
          className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-white transition-all transform hover:scale-110 active:scale-95 cursor-pointer ${
            isOpenContact ? 'bg-red-500 hover:bg-red-600 rotate-90' : 'bg-red-950 hover:bg-red-900 animate-bounce'
          }`}
          style={{ animationDuration: '3s' }}
        >
          {isOpenContact ? (
            <X className="w-6 h-6" />
          ) : (
            <PhoneCall className="w-6 h-6 text-amber-300 animate-pulse" />
          )}
        </button>
      </div>
    </div>
  )
}
