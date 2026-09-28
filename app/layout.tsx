import type { Metadata } from "next"
import { Plus_Jakarta_Sans } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { AuthProvider } from "@/contexts/auth-context"
import MaintenanceScreen from "@/components/maintenance-screen"
import "./globals.css"

// Cấu hình trạng thái tạm khóa / ngưng hoạt động cho toàn bộ hệ thống (Landing page & Admin page)
// Đặt thành false nếu muốn mở lại hoạt động bình thường
const IS_MAINTENANCE = true

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: "Lavie Car Rental - Thông báo tạm ngưng hoạt động",
  description: "Hệ thống website và quản trị Lavie Car Rental đang trong trạng thái tạm ngưng hoạt động.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-light-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="vi" className={plusJakarta.variable}>
      <body className={`${plusJakarta.className} font-sans antialiased bg-background min-h-screen`}>
        {IS_MAINTENANCE ? (
          <MaintenanceScreen />
        ) : (
          <AuthProvider>{children}</AuthProvider>
        )}
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}

