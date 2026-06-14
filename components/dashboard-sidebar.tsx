"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import { USERS } from "@/contexts/auth-context"
import {
  Car,
  ClipboardList,
  FileText,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Users,
  Wrench,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface SidebarProps {
  children: React.ReactNode
}

const menuItems = [
  {
    title: "Tổng quan",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Quản lý xe",
    href: "/dashboard/vehicles",
    icon: Car,
  },
  {
    title: "Khách thuê",
    href: "/dashboard/customers",
    icon: Users,
  },
  {
    title: "Đơn thuê",
    href: "/dashboard/orders",
    icon: ClipboardList,
  },
  {
    title: "Bảo trì",
    href: "/dashboard/maintenance",
    icon: Wrench,
  },
  {
    title: "Báo cáo",
    href: "/dashboard/reports",
    icon: FileText,
  },
]

export function DashboardSidebar({ children }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  
  const isPawnshop = pathname.includes("/pawnshop")

  const currentMenuItems = isPawnshop 
    ? [
        { title: "Tổng thể", href: "/dashboard/pawnshop?tab=dashboard", icon: LayoutDashboard },
        { title: "Đồ cầm", href: "/dashboard/pawnshop?tab=assets", icon: Car },
        { title: "Khách cầm", href: "/dashboard/pawnshop?tab=customers", icon: Users },
        { title: "Đơn cầm", href: "/dashboard/pawnshop?tab=contracts", icon: ClipboardList },
        { title: "Lịch sử truy cập", href: "/dashboard/pawnshop?tab=history", icon: History, requireAdmin: true },
        { title: "Sao lưu khôi phục", href: "/dashboard/pawnshop?tab=backup", icon: Settings, requireAdmin: true },
      ]
    : [
        { title: "Tổng quan", href: "/dashboard", icon: LayoutDashboard },
        { title: "Quản lý xe", href: "/dashboard/vehicles", icon: Car },
        { title: "Khách thuê", href: "/dashboard/customers", icon: Users },
        { title: "Đơn thuê", href: "/dashboard/orders", icon: ClipboardList },
        { title: "Bảo trì", href: "/dashboard/maintenance", icon: Wrench },
        { title: "Báo cáo", href: "/dashboard/reports", icon: FileText },
        { title: "Lịch sử truy cập", href: "/dashboard/access-history", icon: History, requirePermission: "canViewAccessHistory" as const },
      ]
  
  // Password change state
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [changingPassword, setChangingPassword] = useState(false)

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const handleChangePassword = async () => {
    try {
      setPasswordMessage(null)
      setChangingPassword(true)

      // Validate
      if (!oldPassword || !newPassword || !confirmPassword) {
        setPasswordMessage({ type: 'error', text: '❌ Vui lòng điền đầy đủ thông tin' })
        return
      }

      if (newPassword !== confirmPassword) {
        setPasswordMessage({ type: 'error', text: '❌ Mật khẩu mới không khớp' })
        return
      }

      if (newPassword.length < 6) {
        setPasswordMessage({ type: 'error', text: '❌ Mật khẩu phải ít nhất 6 ký tự' })
        return
      }

      const foundUser = USERS.find(u => u.username === user?.username && u.password === oldPassword)
      if (!foundUser) {
        setPasswordMessage({ type: 'error', text: '❌ Mật khẩu cũ không đúng' })
        return
      }

      // Local-only: update in USERS array (session only)
      foundUser.password = newPassword
      setPasswordMessage({ type: 'success', text: '✅ Đổi mật khẩu thành công' })
      setOldPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (error) {
      console.error(error)
      setPasswordMessage({ type: 'error', text: '❌ Đã có lỗi xảy ra' })
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <div className="flex min-h-screen gradient-bg">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen w-20 bg-purple-950 border-r border-purple-900 transition-transform duration-300 flex flex-col shadow-lg shadow-purple-950/20",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-center h-24 border-b border-purple-900">
          <div className="relative w-[68px] h-[68px] bg-purple-900 rounded-xl overflow-hidden flex items-center justify-center border border-purple-500 shadow-md">
            <Image
              src="/logo.jpg"
              alt="Lavie Car Rental Logo"
              fill
              className="object-contain"
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-3 space-y-2">
          {currentMenuItems
            .filter((item: any) => {
              if (item.requireAdmin && user?.role !== "admin") {
                return false
              }
              if (item.requirePermission === "canViewAccessHistory" && !user?.permissions?.canViewAccessHistory) {
                return false
              }
              return true
            })
            .map((item: any) => {
              const isActive = pathname === "/dashboard/pawnshop" && item.href === "/dashboard/pawnshop?tab=dashboard"
                ? true
                : (pathname === "/dashboard/pawnshop"
                  ? (searchParams?.get("tab")
                    ? item.href.includes(`tab=${searchParams.get("tab")}`)
                    : item.href.includes("tab=dashboard"))
                  : pathname === item.href)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "group flex items-center justify-center w-14 h-14 rounded-2xl transition-all duration-200 mx-auto",
                    isActive
                      ? "bg-gradient-to-br from-amber-400 to-amber-500 text-purple-950 shadow-lg shadow-amber-400/20 font-bold"
                      : "text-purple-300 hover:bg-purple-900/50 hover:text-white"
                  )}
                  title={item.title}
                >
                  <item.icon className="w-5 h-5" />
                </Link>
              )
            })}
        </nav>

        {/* Bottom section - compact spacing */}
        <div className="p-2 space-y-1 border-t border-purple-900">
          {/* User Avatar - Clickable */}
          {user && (
            <button
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-purple-950 mx-auto cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200 border border-amber-300/30"
              title={`${user.displayName} (${user.username})`}
            >
              <span className="text-purple-950 text-sm font-bold uppercase">
                {user.displayName.charAt(0)}
              </span>
            </button>
          )}
          
          {/* Settings Link - Only visible to Admins, hidden in Pawnshop */}
          {user?.role === "admin" && !isPawnshop && (
            <Link
              href="/dashboard/settings"
              onClick={() => setMobileOpen(false)}
              className={cn(
                "group flex items-center justify-center w-14 h-14 rounded-2xl transition-all duration-200 mx-auto",
                pathname === "/dashboard/settings"
                  ? "bg-gradient-to-br from-amber-400 to-amber-500 text-purple-950 font-bold"
                  : "text-purple-300 hover:bg-purple-900/50 hover:text-white"
              )}
              title="Cài đặt - Sao lưu & Khôi phục"
            >
              <Settings className="w-5 h-5" />
            </Link>
          )}
          
          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center justify-center w-14 h-14 rounded-2xl text-purple-300 hover:bg-red-950/50 hover:text-red-400 transition-all duration-200 mx-auto"
            title="Đăng xuất"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        {/* Close button - mobile only */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:ml-20">
        {/* Mobile menu button */}
        <div className="lg:hidden sticky top-0 z-30 flex items-center h-14 px-4 bg-transparent">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl hover:bg-white/50"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </Button>
        </div>

        {/* Page content */}
        <main className="p-4 lg:p-8 lg:pt-8">{children}</main>
      </div>

      {/* User Profile Modal */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="bg-white rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-800">Thông tin cá nhân</DialogTitle>
            <DialogDescription className="text-gray-500">Quản lý tài khoản của bạn</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* User Info */}
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-800 mx-auto mb-3">
                <span className="text-white text-2xl font-semibold uppercase">
                  {user?.displayName.charAt(0)}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900">{user?.displayName}</h3>
              <p className="text-sm text-gray-600">Username: {user?.username}</p>
              <p className="text-sm text-gray-600">Quyền: {user?.role === 'admin' ? 'Admin' : 'Staff'}</p>
            </div>

            {/* Change Password Section */}
            <div className="border-t border-gray-200 pt-6 space-y-4">
              <h4 className="font-semibold text-gray-900">Đổi mật khẩu</h4>

              {passwordMessage && (
                <div className={`p-3 rounded-lg text-sm ${passwordMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  {passwordMessage.text}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <Label className="text-sm text-gray-600">Mật khẩu cũ</Label>
                  <Input
                    type="password"
                    placeholder="Nhập mật khẩu cũ"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-sm text-gray-600">Mật khẩu mới</Label>
                  <Input
                    type="password"
                    placeholder="Nhập mật khẩu mới"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-sm text-gray-600">Xác nhận mật khẩu</Label>
                  <Input
                    type="password"
                    placeholder="Xác nhận mật khẩu mới"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              <Button
                onClick={handleChangePassword}
                disabled={changingPassword}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
              >
                {changingPassword ? "Đang xử lý..." : "Đổi mật khẩu"}
              </Button>
            </div>

            {/* Logout Button */}
            <Button
              onClick={() => {
                setIsProfileOpen(false)
                handleLogout()
              }}
              variant="outline"
              className="w-full text-red-600 border-red-200 hover:bg-red-50 rounded-lg"
            >
              Đăng xuất
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
