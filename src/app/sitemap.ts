import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { getEvents } from "@/lib/data/public";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url.replace(/\/$/, "");
  const events = await getEvents();
  const pages = ["", "/events", "/quizzes", "/gallery", "/signup"].map((path) => ({
    url: `${base}${path}`,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));
  return [
    ...pages,
    ...events.map((e) => ({ url: `${base}/events/${e.slug}`, lastModified: e.created_at ?? e.starts_at, priority: 0.6 })),
  ];
}
