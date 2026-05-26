import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_MARKETING_URL ?? "https://pandaclock.uz";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const urls = [
    { url: "/", priority: 1, changeFrequency: "weekly" as const },
    { url: "/#features", priority: 0.8, changeFrequency: "monthly" as const },
    { url: "/#pricing", priority: 0.9, changeFrequency: "monthly" as const },
    { url: "/#industries", priority: 0.7, changeFrequency: "monthly" as const },
    { url: "/#faq", priority: 0.6, changeFrequency: "monthly" as const },
  ];
  return urls.map((entry) => ({
    url: `${BASE_URL}${entry.url}`,
    lastModified: now,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));
}
