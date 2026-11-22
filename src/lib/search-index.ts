import { localePath } from "@/i18n/path";
import { routing } from "@/i18n/routing";

const PRODUCTION_ORIGIN = "https://acrossflare.com";

/** Public pages Naver and other crawlers should list. Login and console stay out. */
const INDEXABLE_PAGES = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/pricing", changeFrequency: "weekly", priority: 0.9 },
  { path: "/standard", changeFrequency: "weekly", priority: 0.8 },
  { path: "/hybrid", changeFrequency: "weekly", priority: 0.8 },
  { path: "/workspace", changeFrequency: "weekly", priority: 0.8 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
] as const;

/** Prefix match. Listed for the default locale and every prefixed locale. */
const PRIVATE_ROOTS = ["/app", "/admin", "/dashboard", "/checkout", "/support", "/dev"] as const;

export function searchOrigin(appUrl = process.env.APP_URL) {
  const raw = (appUrl || PRODUCTION_ORIGIN).replace(/\/$/, "");
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(raw)) {
    return PRODUCTION_ORIGIN;
  }
  return raw;
}

export function absoluteLocaleUrl(origin: string, locale: string, path: string) {
  const localized = localePath(locale, path);
  const base = origin.replace(/\/$/, "");
  return localized === "/" ? base : `${base}${localized}`;
}

function languageAlternates(origin: string, path: string) {
  const languages: Record<string, string> = {
    "x-default": absoluteLocaleUrl(origin, routing.defaultLocale, path),
  };
  for (const locale of routing.locales) {
    languages[locale] = absoluteLocaleUrl(origin, locale, path);
  }
  return languages;
}

export function searchIndexEntries(origin = searchOrigin()) {
  return INDEXABLE_PAGES.flatMap((page) =>
    routing.locales.map((locale) => ({
      url: absoluteLocaleUrl(origin, locale, page.path),
      changeFrequency: page.changeFrequency,
      priority: page.priority,
      alternates: {
        languages: languageAlternates(origin, page.path),
      },
    })),
  );
}

export function crawlerDisallowPaths() {
  const prefixed = routing.locales.flatMap((locale) =>
    PRIVATE_ROOTS.map((path) => `/${locale}${path}`),
  );
  return [...new Set([...PRIVATE_ROOTS, ...prefixed, "/api"])];
}

/** Issued by Naver Search Advisor for https://acrossflare.com. Public; it is printed in the homepage head. */
export const NAVER_SITE_VERIFICATION = "9afadf68e92814faa96c6144a21330435e278f39";

/** Naver Search Advisor HTML meta tag. An empty string omits the tag. */
export function naverSiteVerificationMetadata(code: string | undefined) {
  const trimmed = code?.trim();
  if (!trimmed) {
    return {};
  }
  return {
    verification: {
      other: {
        "naver-site-verification": trimmed,
      },
    },
  };
}
