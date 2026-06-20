import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.farmatotal.com.py";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/caja/", "/mi-cuenta/"] }],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
