/** Storefront HTML ISR + Cloudflare edge TTL (seconds). */
export const STOREFRONT_REVALIDATE_SECONDS = 3600;

export const MARKETING_CACHE_CONTROL = `public, max-age=0, s-maxage=${STOREFRONT_REVALIDATE_SECONDS}, stale-while-revalidate=86400`;
export const MARKETING_CDN_CACHE_CONTROL = `public, s-maxage=${STOREFRONT_REVALIDATE_SECONDS}, stale-while-revalidate=86400`;
export const PRIVATE_NO_STORE = "private, no-store";

const LOCALE = ":locale(en|ko|zh|ja)";

/** Paths whose HTML is identical for every visitor and safe to cache at the edge. */
export const MARKETING_CACHE_SOURCES = [
  `/${LOCALE}`,
  `/${LOCALE}/standard`,
  `/${LOCALE}/hybrid`,
  `/${LOCALE}/workspace`,
  `/${LOCALE}/pricing`,
  `/${LOCALE}/terms`,
  `/${LOCALE}/privacy`,
  `/${LOCALE}/login`,
  `/${LOCALE}/signup`,
] as const;

/** Paths that read cookies, Accept-Language, or user input and must never be shared. */
export const PRIVATE_CACHE_SOURCES = [
  "/",
  `/${LOCALE}/support`,
  `/${LOCALE}/checkout`,
  `/${LOCALE}/app`,
  `/${LOCALE}/app/:path*`,
  `/${LOCALE}/admin`,
  `/${LOCALE}/admin/:path*`,
  `/${LOCALE}/dashboard`,
  `/${LOCALE}/dashboard/:path*`,
  "/api/auth/:path*",
] as const;
