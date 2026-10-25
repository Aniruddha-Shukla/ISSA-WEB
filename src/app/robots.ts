import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { vaultPath } from "@/content/flag-hunt";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/profile", "/api", "/auth", vaultPath] },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
