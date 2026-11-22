import type { MetadataRoute } from "next";
import { crawlerDisallowPaths, searchOrigin } from "@/lib/search-index";

export default function robots(): MetadataRoute.Robots {
  const origin = searchOrigin();
  // Yeti (Naver) follows User-agent: * when it has no group of its own.
  // A Yeti-only Allow would ignore these Disallow lines.
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: crawlerDisallowPaths(),
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}
