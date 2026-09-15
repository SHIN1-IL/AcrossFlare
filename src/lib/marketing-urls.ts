import { routing } from "@/i18n/routing";
import { localePath } from "@/i18n/path";

/** Path suffixes under a locale home that Cloudflare may edge-cache. Keep in sync with `http-cache.ts` + infra edge scripts. */
export const MARKETING_PATH_SUFFIXES = [
  "",
  "/standard",
  "/hybrid",
  "/workspace",
  "/pricing",
  "/terms",
  "/privacy",
  "/login",
  "/signup",
] as const;

export function marketingLocales() {
  return routing.locales;
}

/** Absolute storefront URLs for purge / warm (canonical + default-locale aliases). */
export function marketingUrls(origin: string): string[] {
  const base = origin.replace(/\/$/, "");
  const urls = new Set<string>();
  for (const locale of marketingLocales()) {
    for (const suffix of MARKETING_PATH_SUFFIXES) {
      urls.add(`${base}${localePath(locale, suffix || "/")}`);
    }
  }
  for (const suffix of MARKETING_PATH_SUFFIXES) {
    urls.add(`${base}/${routing.defaultLocale}${suffix}`);
  }
  return [...urls];
}
