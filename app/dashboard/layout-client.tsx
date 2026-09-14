"use client"

import { useEffect, Suspense } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { RentalDataProvider } from "@/contexts/rental-data-context"
import { NewOrderRealtimeNotifier } from "@/components/dashboard/NewOrderRealtimeNotifier"
import { Loader2 } from "lucide-react"

const RENTAL_PATHS = [
  "/dashboard/vehicles",
  "/dashboard/customers",
  "/dashboard/orders",
  "/dashboard/maintenance",
]

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
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
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        <p className="text-sm text-purple-400 font-medium">Đang tải dữ liệu...</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (pathname === "/dashboard/selection" || pathname.endsWith("/selection")) {
    return <div className="min-h-screen bg-slate-950 text-slate-100">{children}</div>
  }

  const isRentalPath = RENTAL_PATHS.some((p) => pathname.startsWith(p))

  return (
    <DashboardSidebar>
      <NewOrderRealtimeNotifier />
      {isRentalPath ? <RentalDataProvider>{children}</RentalDataProvider> : children}
    </DashboardSidebar>
  )
}

export default function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center gradient-bg">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      }
    >
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </Suspense>
  )
}
