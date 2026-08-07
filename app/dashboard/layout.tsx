"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { RentalDataProvider } from "@/contexts/rental-data-context"

const RENTAL_PATHS = [
  "/dashboard/vehicles",
  "/dashboard/customers",
  "/dashboard/orders",
  "/dashboard/maintenance",
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gradient-bg gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-purple-200 border-t-purple-700 animate-spin" />
        <p className="text-sm text-purple-400 font-medium">Đang tải dữ liệu...</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  // Bypass DashboardSidebar wrapper for the selection hub page
  if (pathname === "/dashboard/selection" || pathname.endsWith("/selection")) {
    return <div className="min-h-screen bg-slate-950 text-slate-100">{children}</div>
  }

  const isRentalPath = RENTAL_PATHS.some((p) => pathname.startsWith(p))

  return (
    <DashboardSidebar>
      {isRentalPath ? (
        <RentalDataProvider>{children}</RentalDataProvider>
      ) : (
        children
      )}
    </DashboardSidebar>
  )
}
