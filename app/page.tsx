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
  Menu, X, HelpCircle, PhoneCall, Check, Loader2 
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
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [availableVehicles, setAvailableVehicles] = useState<any[]>([])
  const [totalDays, setTotalDays] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [bookingSuccess, setBookingSuccess] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null)
  
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
        return vehicle.status === "available" && !conflictingVehicleIds.has(vehicle.id)
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
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-purple-600 selection:text-white">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-purple-100/50 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 relative bg-purple-900 rounded-xl overflow-hidden flex items-center justify-center border border-purple-500 shadow-md">
              <Image 
                src="/logo.jpg"
                alt="Lavie Car Rental Logo" 
                fill
                className="object-contain"
                onError={(e) => {
                  // Fallback if logo not found
                  const target = e.target as HTMLElement;
                  target.style.display = 'none';
                }}
              />
            </div>
            <div>
              <span className="text-2xl font-black bg-gradient-to-r from-purple-800 to-amber-600 bg-clip-text text-transparent tracking-wider font-serif">LAVIE CAR</span>
              <span className="block text-[10px] text-purple-600 font-semibold tracking-widest uppercase">Cho thuê xe ô tô tự lái - có lái Huế</span>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#booking" className="hover:text-purple-800 transition-colors">Đặt Xe</a>
            <a href="#about" className="hover:text-purple-800 transition-colors">Về Chúng Tôi</a>
            <a href="#fleet" className="hover:text-purple-800 transition-colors">Bảng Giá</a>
            <a href="#process" className="hover:text-purple-800 transition-colors">Quy Trình</a>
            <a href="#contact" className="hover:text-purple-800 transition-colors">Liên Hệ</a>
          </nav>

          <div className="flex items-center gap-4">
            <Link 
              href="/login"
              className="px-5 py-2.5 rounded-xl border border-purple-200 hover:border-purple-600 hover:text-purple-800 transition-all font-semibold text-sm flex items-center gap-2 hover:shadow-sm"
            >
              <User className="w-4 h-4" />
              <span>Đăng nhập Admin</span>
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
        <div className="absolute inset-0 bg-gradient-to-tr from-purple-950/95 via-slate-950/90 to-indigo-950/95 z-0" />
        {/* Subtle royal pattern indicator using radial gradient */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-700/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-600/5 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Hero text (7 columns) */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-800/60 border border-purple-500/30 text-amber-300 text-xs font-semibold uppercase tracking-wider">
              <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
              Cho thuê xe ô tô tự lái – có lái Huế
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black font-serif leading-tight text-white uppercase">
              Xe Của Bạn, <br />
              <span className="bg-gradient-to-r from-amber-400 via-purple-300 to-amber-300 bg-clip-text text-transparent">Hành Trình Của Bạn</span>
            </h1>
            <p className="text-lg text-slate-300 max-w-xl mx-auto lg:mx-0 leading-relaxed font-light">
              Lavie Car Rental chuyên cung cấp dịch vụ cho thuê xe ô tô tự lái và có lái tại Huế, City Tour Huế, đón tiễn sân bay Phú Bài, nhận chạy hợp đồng du lịch đi các tỉnh. Cam kết giá cả hợp lý, xe đời mới đa dạng, an toàn tuyệt đối và hỗ trợ 24/7.
            </p>
            
            <div className="hidden lg:flex items-center gap-6 pt-4 text-sm text-purple-300">
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
                <span>Giá cả minh bạch</span>
              </div>
            </div>
          </div>

          {/* Booking Form (5 columns) */}
          <div id="booking" className="lg:col-span-5 bg-white text-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-purple-100 hover:shadow-purple-900/10 transition-all duration-300">
            <h2 className="text-2xl font-bold text-purple-950 font-serif text-center mb-6">
              Tìm Xe Ô Tô Trống
            </h2>
            
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="name" className="text-xs font-semibold text-slate-500 uppercase">Họ và tên *</Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-purple-500/60" />
                  <Input 
                    id="name"
                    type="text"
                    required
                    placeholder="Nguyễn Văn A"
                    className="pl-11 h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-purple-600 focus:ring-purple-600/20 rounded-xl transition-all"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="phone" className="text-xs font-semibold text-slate-500 uppercase">Số điện thoại *</Label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-purple-500/60" />
                  <Input 
                    id="phone"
                    type="tel"
                    required
                    placeholder="0363 077 775"
                    className="pl-11 h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-purple-600 focus:ring-purple-600/20 rounded-xl transition-all"
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
                    className="h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-purple-600 focus:ring-purple-600/20 rounded-xl text-sm"
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
                    className="h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-purple-600 focus:ring-purple-600/20 rounded-xl text-sm"
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="facebook" className="text-xs font-semibold text-slate-500 uppercase">Link Facebook hoặc Zalo</Label>
                <div className="relative">
                  <Facebook className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-purple-500/60" />
                  <Input 
                    id="facebook"
                    type="text"
                    placeholder="facebook.com/nguyenvana"
                    className="pl-11 h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-purple-600 focus:ring-purple-600/20 rounded-xl transition-all"
                    value={formData.facebook}
                    onChange={(e) => setFormData({...formData, facebook: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="address" className="text-xs font-semibold text-slate-500 uppercase">Địa chỉ (tại Huế hoặc nơi ở)</Label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-purple-500/60" />
                  <Input 
                    id="address"
                    type="text"
                    placeholder="Khách sạn Hương Giang, Lê Lợi, Huế"
                    className="pl-11 h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-purple-600 focus:ring-purple-600/20 rounded-xl transition-all"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-purple-900 hover:bg-purple-950 text-white rounded-xl shadow-lg shadow-purple-900/20 font-semibold transition-all mt-4 hover-lift"
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
            </form>
          </div>
        </div>
      </section>

      {/* About Section - Hue Tourism Theme */}
      <section id="about" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-purple-700 font-bold uppercase tracking-wider text-sm block">Đặc Quyền Của Bạn</span>
            <h2 className="text-3xl sm:text-4xl font-bold font-serif text-purple-950">
              Tại sao nên thuê xe ô tô tự lái tại Lavie Car Rental?
            </h2>
            <div className="w-20 h-1 bg-amber-500 mx-auto rounded-full mt-4" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-purple-50/50 border border-purple-100 hover:shadow-xl transition-all duration-300 space-y-4 group">
              <div className="w-14 h-14 bg-purple-950 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Car className="w-7 h-7 text-amber-300" />
              </div>
              <h3 className="text-xl font-bold text-purple-950 font-serif">Giá Cả Hợp Lý</h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                Chúng tôi cam kết mang lại mức giá cạnh tranh và hợp lý nhất cho mọi hành trình du lịch hoặc công tác của bạn tại Huế.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-purple-50/50 border border-purple-100 hover:shadow-xl transition-all duration-300 space-y-4 group">
              <div className="w-14 h-14 bg-purple-950 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Shield className="w-7 h-7 text-amber-300" />
              </div>
              <h3 className="text-xl font-bold text-purple-950 font-serif">Đa Dạng Các Loại Xe</h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                Đội xe phong phú từ sedan đến SUV 4-7 chỗ đời mới, sạch sẽ, hoạt động ổn định, bảo dưỡng định kỳ và đầy đủ tiện nghi.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-purple-50/50 border border-purple-100 hover:shadow-xl transition-all duration-300 space-y-4 group">
              <div className="w-14 h-14 bg-purple-950 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <MapPin className="w-7 h-7 text-amber-300" />
              </div>
              <h3 className="text-xl font-bold text-purple-950 font-serif">An Toàn Tuyệt Đối, Hỗ Trợ 24/7</h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                Chúng tôi luôn đồng hành cùng bạn trên mọi nẻo đường với đội ngũ nhân viên nhiệt tình, hỗ trợ kỹ thuật và cứu hộ 24/7.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Fleet Showcase & Price table */}
      <section id="fleet" className="py-20 bg-purple-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-purple-700 font-bold uppercase tracking-wider text-sm block">Đội Xe Hùng Hậu</span>
            <h2 className="text-3xl sm:text-4xl font-bold font-serif text-purple-950">Bảng Giá Cho Thuê Tham Khảo</h2>
            <p className="text-slate-600">Mức giá đã bao gồm bảo hiểm, cạnh tranh và không phát sinh chi phí ẩn</p>
            <div className="w-20 h-1 bg-amber-500 mx-auto rounded-full mt-4" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Sedan option */}
            <div className="bg-white rounded-3xl overflow-hidden shadow-md border border-slate-100 hover:shadow-xl transition-shadow">
              <div className="h-48 bg-slate-200 relative flex items-center justify-center text-slate-400">
                <Car className="w-16 h-16 opacity-30" />
                <span className="absolute bottom-4 left-4 bg-purple-900 text-amber-300 text-xs px-3 py-1 rounded-full font-semibold">Sedan 4-5 Chỗ</span>
              </div>
              <div className="p-6 space-y-4">
                <h3 className="text-xl font-bold text-slate-800">Dòng Sedan Đô Thị</h3>
                <p className="text-xs text-slate-500">Toyota Vios, Mazda 3, Hyundai Accent hoặc tương đương</p>
                <div className="border-t border-b border-slate-100 py-3 flex items-center justify-between text-sm">
                  <span className="text-slate-500">Giá chỉ từ:</span>
                  <span className="text-purple-800 font-extrabold text-lg">700.000đ / ngày</span>
                </div>
                <ul className="text-xs text-slate-600 space-y-2">
                  <li className="flex items-center gap-2">✓ Số tự động, điều hòa mát lạnh</li>
                  <li className="flex items-center gap-2">✓ Phù hợp đi trong thành phố và lân cận</li>
                </ul>
              </div>
            </div>

            {/* SUV option */}
            <div className="bg-white rounded-3xl overflow-hidden shadow-md border border-slate-100 hover:shadow-xl transition-shadow">
              <div className="h-48 bg-slate-200 relative flex items-center justify-center text-slate-400">
                <Car className="w-16 h-16 opacity-30" />
                <span className="absolute bottom-4 left-4 bg-purple-900 text-amber-300 text-xs px-3 py-1 rounded-full font-semibold">SUV 5-7 Chỗ</span>
              </div>
              <div className="p-6 space-y-4">
                <h3 className="text-xl font-bold text-slate-800">Dòng SUV Đa Dụng</h3>
                <p className="text-xs text-slate-500">Mitsubishi Xpander, Toyota Veloz, Hyundai Creta</p>
                <div className="border-t border-b border-slate-100 py-3 flex items-center justify-between text-sm">
                  <span className="text-slate-500">Giá chỉ từ:</span>
                  <span className="text-purple-800 font-extrabold text-lg">900.000đ / ngày</span>
                </div>
                <ul className="text-xs text-slate-600 space-y-2">
                  <li className="flex items-center gap-2">✓ Gầm cao thoáng mát, cốp rộng rãi</li>
                  <li className="flex items-center gap-2">✓ Phù hợp cho cả gia đình đông người dạo chơi Huế</li>
                </ul>
              </div>
            </div>

            {/* Premium option */}
            <div className="bg-white rounded-3xl overflow-hidden shadow-md border border-slate-100 hover:shadow-xl transition-shadow">
              <div className="h-48 bg-slate-200 relative flex items-center justify-center text-slate-400">
                <Car className="w-16 h-16 opacity-30" />
                <span className="absolute bottom-4 left-4 bg-purple-900 text-amber-300 text-xs px-3 py-1 rounded-full font-semibold">SUV Cao Cấp</span>
              </div>
              <div className="p-6 space-y-4">
                <h3 className="text-xl font-bold text-slate-800">Dòng Cao Cấp / Điện</h3>
                <p className="text-xs text-slate-500">VinFast VF8, Kia Sorento hoặc tương đương</p>
                <div className="border-t border-b border-slate-100 py-3 flex items-center justify-between text-sm">
                  <span className="text-slate-500">Giá chỉ từ:</span>
                  <span className="text-purple-800 font-extrabold text-lg">1.200.000đ / ngày</span>
                </div>
                <ul className="text-xs text-slate-600 space-y-2">
                  <li className="flex items-center gap-2">✓ Trải nghiệm công nghệ vượt trội, sang trọng</li>
                  <li className="flex items-center gap-2">✓ Vận hành êm ái thích hợp đi xa ngoại tỉnh</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section id="process" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-purple-700 font-bold uppercase tracking-wider text-sm block">Đơn Giản & Nhanh Chóng</span>
            <h2 className="text-3xl sm:text-4xl font-bold font-serif text-purple-950">Quy Trình 3 Bước Thuê Xe</h2>
            <div className="w-20 h-1 bg-amber-500 mx-auto rounded-full mt-4" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            <div className="text-center space-y-4 relative">
              <div className="w-16 h-16 bg-purple-900 text-amber-300 rounded-full flex items-center justify-center font-bold text-xl mx-auto shadow-md">
                1
              </div>
              <h3 className="text-lg font-bold text-purple-950">Đặt Xe & Điền Thông Tin</h3>
              <p className="text-slate-600 text-sm max-w-xs mx-auto">
                Nhập thông tin cá nhân và thời gian thuê xe ngay tại form phía trên để kiểm tra giá và loại xe còn trống.
              </p>
            </div>

            <div className="text-center space-y-4 relative">
              <div className="w-16 h-16 bg-purple-900 text-amber-300 rounded-full flex items-center justify-center font-bold text-xl mx-auto shadow-md">
                2
              </div>
              <h3 className="text-lg font-bold text-purple-950">Xác Nhận & Giao Xe</h3>
              <p className="text-slate-600 text-sm max-w-xs mx-auto">
                Sau khi đặt, Admin sẽ duyệt thông tin và liên hệ ngay để hướng dẫn nhận xe tận nơi ở Huế của bạn.
              </p>
            </div>

            <div className="text-center space-y-4 relative">
              <div className="w-16 h-16 bg-purple-900 text-amber-300 rounded-full flex items-center justify-center font-bold text-xl mx-auto shadow-md">
                3
              </div>
              <h3 className="text-lg font-bold text-purple-950">Khám Phá & Trả Xe</h3>
              <p className="text-slate-600 text-sm max-w-xs mx-auto">
                Vi vu qua các cung đường lăng tẩm Huế, đèo Hải Vân và trả xe dễ dàng khi kết thúc chuyến đi.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Contact Details */}
      <footer id="contact" className="bg-purple-950 text-slate-300 pt-16 pb-8 border-t border-purple-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-12 pb-12 border-b border-purple-900/60">
          <div className="space-y-4">
            <span className="text-xl font-bold font-serif text-white tracking-wider">LAVIE CAR RENTAL</span>
            <p className="text-sm text-slate-400 font-light leading-relaxed">
              Dịch vụ cho thuê xe ô tô tự lái và có lái chất lượng hàng đầu tại thành phố Huế. Cùng bạn tạo nên những chuyến hành trình hạnh phúc và trọn vẹn nhất.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-white font-bold font-serif">Thông Tin Liên Hệ</h3>
            <ul className="space-y-3 text-sm font-light">
              <li className="flex items-start gap-2">
                <MapPin className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <span>12 Lê Lợi, Vĩnh Ninh, Thành phố Huế, Thừa Thiên Huế</span>
              </li>
              <li className="flex items-center gap-2">
                <PhoneCall className="w-5 h-5 text-amber-400" />
                <span>Hotline: 0363.077.775 - 0981.323.653</span>
              </li>
              <li className="flex items-center gap-2">
                <Facebook className="w-5 h-5 text-amber-400" />
                <a href="https://facebook.com/thuexeototulaihue" target="_blank" rel="noopener noreferrer" className="hover:underline">fb.com/thuexeototulaihue</a>
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
          <p>© 2026 Lavie Car Rental. Phát triển bởi Phan Lê Tự Lập.</p>
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
            <div className="p-6 bg-purple-950 text-white flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold font-serif">Danh Sách Xe Trống</h3>
                <p className="text-xs text-purple-300 mt-1">
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
                  <h4 className="text-2xl font-bold text-purple-950 font-serif">Đặt xe thành công!</h4>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Chào mừng bạn <span className="font-semibold text-purple-950">{formData.name}</span>! Chúng tôi đã tiếp nhận yêu cầu thuê xe <span className="font-semibold text-purple-950">{selectedVehicle?.name}</span> ({selectedVehicle?.licensePlate}) của bạn.
                  </p>
                  <p className="text-xs text-amber-600 font-semibold bg-amber-50 p-3 rounded-xl border border-amber-200">
                    Bộ phận hỗ trợ Lavie Car Rental sẽ liên hệ trực tiếp với bạn qua số điện thoại <strong>{formData.phone}</strong> trong vòng 10-15 phút để hoàn tất thủ tục và giao xe!
                  </p>
                  <Button 
                    onClick={closeBookingModal}
                    className="bg-purple-900 hover:bg-purple-950 text-white px-8 rounded-xl"
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
                              <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-950 shadow-sm border border-purple-100">
                                <Car className="w-8 h-8" />
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-800 text-base">{vehicle.name}</h4>
                                <div className="flex gap-3 text-xs text-slate-500 mt-1">
                                  <span>Biển số: <strong className="font-mono text-slate-700">{vehicle.licensePlate}</strong></span>
                                  <span>•</span>
                                  <span>Màu: <strong>{vehicle.color || "Nhiều màu"}</strong></span>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col sm:items-end justify-between gap-2 sm:gap-1">
                              <div className="text-left sm:text-right">
                                <span className="block text-xs text-slate-500">Đơn giá: {vehicle.pricePerDay.toLocaleString("vi-VN")}đ/ngày</span>
                                <span className="block text-base font-extrabold text-purple-950">Tổng thanh toán: {priceTotal.toLocaleString("vi-VN")} VNĐ</span>
                              </div>
                              <Button
                                onClick={() => handleConfirmBooking(vehicle)}
                                disabled={isSubmitting}
                                className="bg-purple-900 hover:bg-purple-950 text-white rounded-xl text-xs px-4 h-9 font-semibold"
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
    </div>
  )
}
