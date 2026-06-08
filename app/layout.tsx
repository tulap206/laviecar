import type { Metadata } from 'next'
// import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/contexts/auth-context'
import './globals.css'

// const inter = Inter({ 
//   subsets: ["latin", "vietnamese"],
//   display: 'swap',
//   variable: '--font-inter',
//});

export const metadata: Metadata = {
  title: 'QUÝ 79 - Cho Thuê - Mua Bán - Cầm Cố Xe Máy - Ô Tô Huế | quy79.com',
  description: 'Cửa hàng 79 chuyên dịch vụ Cho thuê - Mua bán - Cầm cố xe máy và ô tô tự lái uy tín, nhanh chóng, giá tốt nhất tại Huế.',
  icons: {
    icon: [
      { url: '/favicon.ico?v=5', sizes: 'any' },
      { url: '/favicon-32.png?v=5', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png?v=5', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png?v=5', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-icon.png?v=5',
    shortcut: '/favicon.ico?v=5',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="vi" className="">
      <body className="font-sans antialiased bg-background min-h-screen">
        <AuthProvider>
          {children}
        </AuthProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
