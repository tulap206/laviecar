import type { Metadata } from "next"
import LandingPageClient from "./page-client"

export const metadata: Metadata = {
  title: "Lavie Car Rental — Cho thuê xe ô tô tự lái tại Huế",
  description:
    "Thuê ô tô tự lái và có lái tại Huế. City tour, đón tiễn sân bay Phú Bài, hợp đồng du lịch liên tỉnh. Xe đời mới, giá minh bạch, hỗ trợ 24/7.",
  keywords: [
    "thuê xe ô tô huế",
    "thuê xe tự lái huế",
    "lavie car rental",
    "thuê xe sân bay phú bài",
    "city tour huế",
    "thuê xe có lái huế",
  ],
  openGraph: {
    title: "Lavie Car Rental — Cho thuê xe ô tô tự lái tại Huế",
    description:
      "Thuê ô tô tự lái và có lái tại Huế. City tour, đón tiễn sân bay Phú Bài, hỗ trợ 24/7.",
    locale: "vi_VN",
    type: "website",
  },
}

export default function LandingPage() {
  return <LandingPageClient />
}
