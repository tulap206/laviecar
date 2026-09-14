import type { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://laviecar.com",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: "https://laviecar.com/login",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ]
}
