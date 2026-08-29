const CACHED_MARKETING_PATHS = new Set([
  "/",
  "/standard",
  "/hybrid",
  "/workspace",
  "/pricing",
  "/terms",
  "/privacy",
]);

/** Prefix a site-absolute path for `localePrefix: "always"`. */
export function localePath(locale: string, href: string) {
  const [pathname, search] = href.split("?");
  const prefixed = pathname === "/" ? `/${locale}` : `/${locale}${pathname}`;
  return search ? `${prefixed}?${search}` : prefixed;
}

/** HTML for these routes is edge-cached; a full document load is faster than RSC. */
export function isCachedMarketingPath(pathname: string) {
  return CACHED_MARKETING_PATHS.has(pathname);
}
