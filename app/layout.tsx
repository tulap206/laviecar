import type { Metadata, Viewport } from "next"
import { Plus_Jakarta_Sans } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { AuthProvider } from "@/contexts/auth-context"
import { Toaster } from "sonner"
import "./globals.css"

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-sans",
})

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export const metadata: Metadata = {
  title: "Lavie Car Rental - Quản lý cho thuê xe ô tô tự lái",
  description: "Hệ thống quản lý cho thuê xe ô tô tự lái Lavie Car Rental",
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
        <AuthProvider>{children}</AuthProvider>
        <Toaster
          richColors
          position="top-center"
          closeButton
          theme="light"
          toastOptions={{
            style: {
              borderRadius: "16px",
              border: "1px solid rgba(226, 232, 240, 0.8)",
              background: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(8px)",
            },
          }}
        />
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
