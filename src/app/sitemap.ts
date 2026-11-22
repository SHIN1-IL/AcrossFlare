import type { MetadataRoute } from "next";
import { searchIndexEntries, searchOrigin } from "@/lib/search-index";

export default function sitemap(): MetadataRoute.Sitemap {
  return searchIndexEntries(searchOrigin());
}
