import { routing } from "@/i18n/routing";

/** Path suffixes under `/{locale}` that Cloudflare may edge-cache. Keep in sync with `http-cache.ts` + infra edge scripts. */
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

/** Absolute storefront URLs for purge / warm (no trailing slash except locale home). */
export function marketingUrls(origin: string): string[] {
  const base = origin.replace(/\/$/, "");
  const urls: string[] = [];
  for (const locale of marketingLocales()) {
    for (const suffix of MARKETING_PATH_SUFFIXES) {
      urls.push(`${base}/${locale}${suffix}`);
    }
  }
  return urls;
}
