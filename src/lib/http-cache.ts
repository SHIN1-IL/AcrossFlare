/** Storefront HTML ISR + Cloudflare edge TTL (seconds). Long TTL + purge/warm keeps Free PoPs hot without hammering the origin. */
export const STOREFRONT_REVALIDATE_SECONDS = 86400;

export const MARKETING_CACHE_CONTROL = `public, max-age=0, s-maxage=${STOREFRONT_REVALIDATE_SECONDS}, stale-while-revalidate=86400`;
export const MARKETING_CDN_CACHE_CONTROL = `public, s-maxage=${STOREFRONT_REVALIDATE_SECONDS}, stale-while-revalidate=86400`;
export const PRIVATE_NO_STORE = "private, no-store";

const LOCALE = ":locale(en|ko|zh|ja)";

const MARKETING_SUFFIXES = [
  "/standard",
  "/hybrid",
  "/workspace",
  "/pricing",
  "/terms",
  "/privacy",
  "/login",
  "/signup",
] as const;

/** Paths whose HTML is identical for every visitor and safe to cache at the edge. */
export const MARKETING_CACHE_SOURCES = [
  "/",
  ...MARKETING_SUFFIXES,
  `/${LOCALE}`,
  ...MARKETING_SUFFIXES.map((suffix) => `/${LOCALE}${suffix}`),
] as const;

const PRIVATE_SUFFIXES = [
  "/support",
  "/checkout",
  "/app",
  "/app/:path*",
  "/admin",
  "/admin/:path*",
  "/dashboard",
  "/dashboard/:path*",
] as const;

/** Paths that read cookies or user input and must never be shared. */
export const PRIVATE_CACHE_SOURCES = [
  ...PRIVATE_SUFFIXES,
  ...PRIVATE_SUFFIXES.map((suffix) => `/${LOCALE}${suffix}`),
  "/api/auth/:path*",
] as const;
