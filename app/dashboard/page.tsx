"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Car,
  Users,
  ClipboardList,
  TrendingUp,
  Wallet,
  Eye,
  ArrowRight,
  Database,
  CheckCircle2,
  Clock,
  Bike,
} from "lucide-react"
import { fetchVehicles, fetchRentals, fetchTransactions, supabase } from "@/lib/supabase"


interface DashboardStats {
  totalVehicles: number
  totalRevenue: number
  totalProfit: number
  totalRentals: number
  activeRentals: number
}

interface RecentOrder {
  id: string
  customer: string
  vehicle: string
  price: string
  unit: number
  status: string
}

interface TopVehicle {
  id: string
  name: string
  licensePlate: string
  rentals: number
  revenue: string
  profit: string
  image?: string[]
  category?: string
}

const statusConfig: Record<string, { label: string; className: string }> = {
  completed: { label: "Hoàn thành", className: "bg-emerald-50 text-emerald-700 border border-emerald-100" },
  active: { label: "Đang thuê", className: "bg-red-50 text-red-700 border border-red-100" },
  pending: { label: "Chờ xử lý", className: "bg-amber-50 text-amber-700 border border-amber-100" },
  cancelled: { label: "Đã hủy", className: "bg-slate-100 text-slate-500 border border-slate-200" },
}

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    totalVehicles: 0,
    totalRevenue: 0,
    totalProfit: 0,
    totalRentals: 0,
    activeRentals: 0,
  })
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [topVehicles, setTopVehicles] = useState<TopVehicle[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedOrder, setSelectedOrder] = useState<RecentOrder | null>(null)
  const [selectedVehicle, setSelectedVehicle] = useState<TopVehicle | null>(null)
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false)
  const [isVehicleDialogOpen, setIsVehicleDialogOpen] = useState(false)

  const loadDashboardData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      const vehicles = await fetchVehicles()
      const rentals = await fetchRentals()
      const transactions = await fetchTransactions()

      // Calculate stats
      const completedRentals = rentals.filter((r: any) => r.status === 'completed')
      const activeRentals = rentals.filter((r: any) => r.status === 'active')
      
      // Rental revenue (from completed rentals, includes extraFees via revenue field)
      const rentalRevenue = completedRentals.reduce((sum: number, r: any) => sum + (r.revenue || r.totalPrice || 0), 0)

      
      // Transaction totals
      const totalIncome = transactions
        .filter((tx: any) => tx.type === 'income')
        .reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0)
      
      // Doanh thu = Rental revenue + Income from transactions
      const totalRevenue = rentalRevenue + totalIncome
      
      // Lợi nhuận = Rental revenue ONLY (not counting transactions)
      const totalProfit = rentalRevenue

      setStats({
        totalVehicles: vehicles.length,
        totalRevenue,
        totalProfit,
        totalRentals: rentals.length,
        activeRentals: activeRentals.length,
      })

      // Map recent rentals for display (slice to 6 as in the update)
      const recent = rentals.slice(0, 6).map((r: any) => ({
        id: r.id,
        customer: r.customerName,
        vehicle: r.vehicleName,
        price: `${(r.pricePerDay / 1000).toFixed(0)}K`,
        unit: r.totalDays,
        status: r.status,
      }))
      setRecentOrders(recent)

      // Sort vehicles by rental count for top vehicles
      const vehiclesWithRentals = vehicles.map((v: any) => {
        // Calculate vehicle profit = revenue from rentals - purchase price
        const vehicleRentals = rentals.filter((r: any) => r.vehicleId === v.id && r.status === 'completed')
        const vehicleRevenue = vehicleRentals.reduce((sum: number, r: any) => sum + (r.revenue || r.totalPrice || 0), 0)
        const vehicleProfit = vehicleRevenue - (v.purchasePrice || 0)
        
        return {
          id: v.id,
          name: v.name,
          licensePlate: v.licensePlate,
          rentals: vehicleRentals.length,
          revenue: `${vehicleRevenue.toLocaleString("vi-VN")} ₫`,
          profit: `${vehicleProfit.toLocaleString("vi-VN")} ₫`,
          image: v.vehicleImages || [],
          category: v.category,
        }
      }).sort((a, b) => b.rentals - a.rentals).slice(0, 4)

      setTopVehicles(vehiclesWithRentals)
    } catch (error) {
      console.error("Failed to load dashboard data:", error)
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboardData(true)

    // Subscribe to real-time events for rentals, vehicles, transactions
    const dashboardChannel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rentals' }, () => {
        loadDashboardData(false)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, () => {
        loadDashboardData(false)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        loadDashboardData(false)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(dashboardChannel)
    }
  }, [loadDashboardData])

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value)
  }


  if (loading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-10 bg-slate-200 rounded-xl w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 h-72 bg-slate-200 rounded-2xl" />
          <div className="h-72 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
            Tổng quan kinh doanh
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Quý 79 Moto · quy79.com
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-full">
          <Database className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Dữ liệu Local</span>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Tổng Xe */}
        <Card
          className="cursor-pointer group hover:shadow-md transition-all border-slate-100 hover:border-red-200 rounded-2xl col-span-1"
          onClick={() => router.push("/dashboard/vehicles")}
        >
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Tổng Xe</p>
                <p className="text-3xl font-black text-slate-900 mt-2 leading-none">{stats.totalVehicles}</p>
              </div>
              <div className="p-2.5 bg-red-50 rounded-xl group-hover:bg-red-100 transition-colors">
                <Car className="w-5 h-5 text-red-600" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-3 flex items-center gap-1">
              <ArrowRight className="w-3 h-3" />
              Xem danh sách
            </p>
          </CardContent>
        </Card>

        {/* Đơn thuê */}
        <Card
          className="cursor-pointer group hover:shadow-md transition-all border-slate-100 hover:border-red-200 rounded-2xl col-span-1"
          onClick={() => router.push("/dashboard/orders")}
        >
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Đơn Thuê</p>
                <p className="text-3xl font-black text-slate-900 mt-2 leading-none">{stats.totalRentals}</p>
              </div>
              <div className="p-2.5 bg-red-50 rounded-xl group-hover:bg-red-100 transition-colors">
                <ClipboardList className="w-5 h-5 text-red-600" />
              </div>
            </div>
            <p className="text-xs text-red-500 font-semibold mt-3 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {stats.activeRentals} đang thuê
            </p>
          </CardContent>
        </Card>

        {/* Doanh Thu */}
        <Card
          className="cursor-pointer group hover:shadow-md transition-all border-slate-100 hover:border-red-200 rounded-2xl col-span-2 lg:col-span-2"
          onClick={() => router.push("/dashboard/reports")}
        >
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Doanh Thu</p>
                <p className="text-2xl font-black text-red-600 mt-2 leading-none">{formatPrice(stats.totalRevenue)}</p>
              </div>
              <div className="p-2.5 bg-red-50 rounded-xl group-hover:bg-red-100 transition-colors">
                <Wallet className="w-5 h-5 text-red-600" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-3 flex items-center gap-1">
              <ArrowRight className="w-3 h-3" />
              Xem báo cáo
            </p>
          </CardContent>
        </Card>

        {/* Lợi nhuận */}
        <Card
          className="cursor-pointer group hover:shadow-md transition-all border-slate-100 hover:border-red-200 rounded-2xl col-span-2 lg:col-span-1"
          onClick={() => router.push("/dashboard/reports")}
        >
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Lợi Nhuận</p>
                <p className="text-xl font-black text-emerald-600 mt-2 leading-none">{formatPrice(stats.totalProfit)}</p>
              </div>
              <div className="p-2.5 bg-emerald-50 rounded-xl group-hover:bg-emerald-100 transition-colors">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-3 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              Từ đơn hoàn thành
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Grid: Recent Orders + Top Vehicles ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Rentals */}
        <div className="lg:col-span-2">
          <Card className="rounded-2xl border-slate-100 shadow-sm h-full">
            <CardHeader className="pb-3 border-b border-slate-50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-slate-800">Đơn Thuê Gần Đây</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs h-7 px-3 rounded-lg"
                  onClick={() => router.push("/dashboard/orders")}
                >
                  Xem tất cả
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-2">
                {recentOrders.length === 0 ? (
                  <div className="text-center py-10">
                    <ClipboardList className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">Chưa có đơn thuê nào</p>
                  </div>
                ) : (
                  recentOrders.map((order) => {
                    const sc = statusConfig[order.status] || statusConfig.pending
                    return (
                      <div
                        key={order.id}
                        onClick={() => { setSelectedOrder(order); setIsOrderDialogOpen(true) }}
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                            <Car className="w-4 h-4 text-red-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 text-sm truncate">{order.customer}</p>
                            <p className="text-xs text-slate-500 truncate">{order.vehicle}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sc.className}`}>
                            {sc.label}
                          </span>
                          <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold text-slate-800">{order.price}/ngày</p>
                            <p className="text-xs text-slate-400">{order.unit} ngày</p>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Vehicles */}
        <div>
          <Card className="rounded-2xl border-slate-100 shadow-sm h-full">
            <CardHeader className="pb-3 border-b border-slate-50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-slate-800">Xe Thuê Nhiều Nhất</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs h-7 px-3 rounded-lg"
                  onClick={() => router.push("/dashboard/vehicles")}
                >
                  Xem tất cả
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-2">
                {topVehicles.length === 0 ? (
                  <div className="text-center py-10">
                    <Car className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">Chưa có dữ liệu</p>
                  </div>
                ) : (
                  topVehicles.map((vehicle, idx) => (
                    <div
                      key={vehicle.id}
                      onClick={() => { setSelectedVehicle(vehicle); setIsVehicleDialogOpen(true) }}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <span className="text-xs font-black text-slate-300 w-4 text-center flex-shrink-0">{idx + 1}</span>
                      <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                        {vehicle.category === "bike"
                          ? <Bike className="w-4 h-4 text-slate-500" />
                          : <Car className="w-4 h-4 text-slate-500" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 text-sm truncate">{vehicle.name}</p>
                        <p className="text-xs text-slate-400">{vehicle.licensePlate}</p>
                      </div>
                      <span className="text-xs font-bold text-red-600 flex-shrink-0">{vehicle.rentals} lần</span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Popular Vehicles (Cards) ── */}
      {topVehicles.length > 0 && (
        <Card className="rounded-2xl border-slate-100 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-50">
            <CardTitle className="text-base font-bold text-slate-800">Xe Được Thuê Nhiều</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {topVehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="bg-white border border-slate-100 rounded-2xl overflow-hidden hover:shadow-lg hover:border-red-100 transition-all cursor-pointer group"
                  onClick={() => { setSelectedVehicle(vehicle); setIsVehicleDialogOpen(true) }}
                >
                  {/* Image */}
                  <div className="aspect-video bg-slate-100 overflow-hidden">
                    {vehicle.image && vehicle.image.length > 0 ? (
                      <img
                        src={vehicle.image[0]}
                        alt={vehicle.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                        {vehicle.category === "bike"
                          ? <Bike className="w-10 h-10 text-slate-400" />
                          : <Car className="w-10 h-10 text-slate-400" />
                        }
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <p className="font-bold text-slate-800 text-sm truncate">{vehicle.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{vehicle.licensePlate}</p>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-slate-400">Doanh thu</p>
                        <p className="font-bold text-emerald-600 truncate">{vehicle.revenue}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Lần thuê</p>
                        <p className="font-bold text-red-600">{vehicle.rentals} lần</p>
                      </div>
                    </div>

                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedVehicle(vehicle)
                        setIsVehicleDialogOpen(true)
                      }}
                      className="w-full mt-3 bg-red-600 hover:bg-red-700 text-white rounded-xl h-8 text-xs"
                      size="sm"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1.5" />
                      Chi Tiết
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Order Detail Dialog ── */}
      <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-slate-800">Chi Tiết Đơn Thuê</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-3">
              {[
                { label: "Khách hàng", value: selectedOrder.customer },
                { label: "Xe thuê", value: selectedOrder.vehicle },
                { label: "Giá thuê", value: `${selectedOrder.price}/ngày` },
                { label: "Số ngày", value: `${selectedOrder.unit} ngày` },
                { label: "Trạng thái", value: statusConfig[selectedOrder.status]?.label || selectedOrder.status },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                  <span className="text-sm text-slate-500">{label}</span>
                  <span className="text-sm font-semibold text-slate-800">{value}</span>
                </div>
              ))}
              <Button
                onClick={() => { setIsOrderDialogOpen(false); router.push("/dashboard/orders") }}
                className="w-full bg-red-600 hover:bg-red-700 rounded-xl mt-2"
              >
                Xem đơn thuê đầy đủ
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Vehicle Detail Dialog ── */}
      <Dialog open={isVehicleDialogOpen} onOpenChange={setIsVehicleDialogOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-slate-800">Chi Tiết Xe</DialogTitle>
          </DialogHeader>
          {selectedVehicle && (
            <div className="space-y-4">
              {selectedVehicle.image && selectedVehicle.image.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {selectedVehicle.image.slice(0, 4).map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`${selectedVehicle.name} ${idx + 1}`}
                      className="w-full h-36 object-cover rounded-xl"
                    />
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Tên xe", value: selectedVehicle.name },
                  { label: "Biển số", value: selectedVehicle.licensePlate },
                  { label: "Số lần thuê", value: `${selectedVehicle.rentals} lần` },
                  { label: "Doanh thu", value: selectedVehicle.revenue },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs text-slate-400">{label}</p>
                    <p className="font-bold text-slate-800 text-sm mt-0.5">{value}</p>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => { setIsVehicleDialogOpen(false); router.push("/dashboard/vehicles") }}
                className="w-full bg-red-600 hover:bg-red-700 rounded-xl"
              >
                Xem Chi Tiết Đầy Đủ
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
