import type { Metadata } from "next"
import DashboardLayoutClient from "./layout-client"

export const metadata: Metadata = {
  title: "Lavie Car Rental - Quản trị hệ thống",
  description: "Hệ thống quản lý cho thuê xe ô tô tự lái Lavie Car Rental",
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayoutClient>{children}</DashboardLayoutClient>
}
