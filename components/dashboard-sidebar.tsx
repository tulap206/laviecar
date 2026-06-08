"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
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
  X,
  Shield,
  KeyRound,
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
  { title: "Tổng quan", href: "/dashboard", icon: LayoutDashboard },
  { title: "Quản lý xe", href: "/dashboard/vehicles", icon: Car },
  { title: "Khách thuê", href: "/dashboard/customers", icon: Users },
  { title: "Đơn thuê", href: "/dashboard/orders", icon: ClipboardList },
  { title: "Báo cáo", href: "/dashboard/reports", icon: FileText },
  { title: "Lịch sử truy cập", href: "/dashboard/access-history", icon: History, requirePermission: "canViewAccessHistory" as const },
]

export function DashboardSidebar({ children }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  // Password change state
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [changingPassword, setChangingPassword] = useState(false)

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const handleChangePassword = async () => {
    try {
      setPasswordMessage(null)
      setChangingPassword(true)

      if (!oldPassword || !newPassword || !confirmPassword) {
        setPasswordMessage({ type: "error", text: "❌ Vui lòng điền đầy đủ thông tin" })
        return
      }
      if (newPassword !== confirmPassword) {
        setPasswordMessage({ type: "error", text: "❌ Mật khẩu mới không khớp" })
        return
      }
      if (newPassword.length < 6) {
        setPasswordMessage({ type: "error", text: "❌ Mật khẩu phải ít nhất 6 ký tự" })
        return
      }

      const foundUser = USERS.find((u) => u.username === user?.username && u.password === oldPassword)
      if (!foundUser) {
        setPasswordMessage({ type: "error", text: "❌ Mật khẩu cũ không đúng" })
        return
      }

      // Local-only: update in USERS array (session only)
      foundUser.password = newPassword
      setPasswordMessage({ type: "success", text: "✅ Đổi mật khẩu thành công!" })

      setTimeout(() => {
        setOldPassword("")
        setNewPassword("")
        setConfirmPassword("")
        setPasswordMessage(null)
        setIsProfileOpen(false)
      }, 1500)
    } catch (error) {
      setPasswordMessage({ type: "error", text: `❌ Lỗi: ${(error as any).message}` })
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen w-[72px] bg-slate-950 border-r border-slate-800 transition-transform duration-300 flex flex-col shadow-xl",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-center h-[72px] border-b border-slate-800 flex-shrink-0">
          <Link href="/dashboard">
            <div className="relative w-[48px] h-[48px] rounded-full overflow-hidden ring-2 ring-red-600/60 hover:ring-red-500 transition-all">
              <Image src="/logo.jpg?v=5" alt="QUÝ 79" fill className="object-cover" />
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {menuItems
            .filter(item => {
              if (!item.requirePermission) return true
              return user?.permissions[item.requirePermission] === true
            })
            .map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                title={item.title}
                className={cn(
                  "group relative flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-200 mx-auto",
                  isActive
                    ? "bg-red-600 text-white shadow-lg shadow-red-900/50"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )}
              >
                <item.icon className="w-5 h-5" />
                {/* Tooltip */}
                <span className="absolute left-full ml-3 px-2.5 py-1 bg-slate-800 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-lg z-50">
                  {item.title}
                </span>
              </Link>
            )
          })}
        </nav>

        {/* Bottom section */}
        <div className="p-2 space-y-1 border-t border-slate-800 flex-shrink-0 pb-4">
          {/* User Avatar */}
          {user && (
            <button
              onClick={() => setIsProfileOpen(true)}
              title={`${user.displayName} · ${ user.role === "admin" ? "Admin" : user.role === "mod" ? "Mod" : "Staff"}`}
              className="group relative flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-red-800 mx-auto cursor-pointer hover:shadow-lg hover:shadow-red-900/50 hover:scale-105 transition-all duration-200"
            >
              <span className="text-white text-sm font-bold uppercase">
                {user.displayName.charAt(0)}
              </span>
              <span className="absolute left-full ml-3 px-2.5 py-1 bg-slate-800 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-lg z-50">
                {user.displayName}
              </span>
            </button>
          )}

          {/* Settings — only admin & mod */}
          {user?.permissions.canBackup && (
          <Link
            href="/dashboard/settings"
            onClick={() => setMobileOpen(false)}
            title="Cài đặt & Sao lưu"
            className={cn(
              "group relative flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-200 mx-auto",
              pathname === "/dashboard/settings"
                ? "bg-amber-500 text-white shadow-lg shadow-amber-900/40"
                : "text-slate-400 hover:bg-slate-800 hover:text-amber-400"
            )}
          >
            <Settings className="w-5 h-5" />
            <span className="absolute left-full ml-3 px-2.5 py-1 bg-slate-800 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-lg z-50">
              Cài đặt
            </span>
          </Link>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            title="Đăng xuất"
            className="group relative flex items-center justify-center w-12 h-12 rounded-2xl text-slate-400 hover:bg-red-600/20 hover:text-red-400 transition-all duration-200 mx-auto"
          >
            <LogOut className="w-5 h-5" />
            <span className="absolute left-full ml-3 px-2.5 py-1 bg-slate-800 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-lg z-50">
              Đăng xuất
            </span>
          </button>
        </div>

        {/* Close button — mobile */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden absolute top-4 right-3 p-1 rounded-lg hover:bg-slate-800 transition-colors text-slate-400"
        >
          <X className="w-4 h-4" />
        </button>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 lg:ml-[72px] min-h-screen">
        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-30 flex items-center h-14 px-4 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="w-5 h-5 text-slate-600" />
          </Button>
          <span className="ml-3 font-black italic text-slate-800 text-lg tracking-tight">
            QUÝ <span className="text-red-600">79</span>
          </span>
        </div>

        {/* Page content */}
        <main className="p-4 lg:p-8">{children}</main>
      </div>

      {/* ── Profile Modal ── */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="bg-white rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-800">Thông tin tài khoản</DialogTitle>
            <DialogDescription className="text-slate-500">Quản lý tài khoản của bạn</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Avatar + info */}
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 to-red-800 shadow-lg flex-shrink-0">
                <span className="text-white text-xl font-bold uppercase">
                  {user?.displayName.charAt(0)}
                </span>
              </div>
              <div>
                <p className="font-bold text-slate-800 text-base">{user?.displayName}</p>
                <p className="text-sm text-slate-500">@{user?.username}</p>
                <span className={cn(
                  "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full mt-1",
                  user?.role === "admin"
                    ? "bg-red-50 text-red-600"
                    : user?.role === "mod"
                    ? "bg-orange-50 text-orange-600"
                    : "bg-amber-50 text-amber-600"
                )}>
                  <Shield className="w-3 h-3" />
                  {user?.role === "admin" ? "Admin" : user?.role === "mod" ? "Mod" : "Staff"}
                </span>
              </div>
            </div>

            {/* Change Password */}
            <div className="border-t border-slate-100 pt-5 space-y-4">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-red-600" />
                <h4 className="font-semibold text-slate-800">Đổi mật khẩu</h4>
              </div>

              {passwordMessage && (
                <div className={`p-3 rounded-xl text-sm ${
                  passwordMessage.type === "success"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                    : "bg-red-50 text-red-700 border border-red-100"
                }`}>
                  {passwordMessage.text}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Mật khẩu cũ</Label>
                  <Input
                    type="password"
                    placeholder="Nhập mật khẩu cũ"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="mt-1.5 focus:border-red-500 focus:ring-red-500/20"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Mật khẩu mới</Label>
                  <Input
                    type="password"
                    placeholder="Nhập mật khẩu mới (≥6 ký tự)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mt-1.5 focus:border-red-500 focus:ring-red-500/20"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Xác nhận mật khẩu</Label>
                  <Input
                    type="password"
                    placeholder="Nhập lại mật khẩu mới"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mt-1.5 focus:border-red-500 focus:ring-red-500/20"
                  />
                </div>
              </div>

              <Button
                onClick={handleChangePassword}
                disabled={changingPassword}
                className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-sm shadow-red-900/20"
              >
                {changingPassword ? "Đang xử lý..." : "Xác nhận đổi mật khẩu"}
              </Button>
            </div>

            {/* Logout */}
            <Button
              onClick={() => { setIsProfileOpen(false); handleLogout() }}
              variant="outline"
              className="w-full text-red-600 border-red-200 hover:bg-red-50 rounded-xl"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Đăng xuất
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
