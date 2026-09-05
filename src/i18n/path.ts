const CACHED_MARKETING_PATHS = new Set([
  "/",
  "/standard",
  "/hybrid",
  "/workspace",
  "/pricing",
  "/terms",
  "/privacy",
  "/login",
  "/signup",
]);

/** Prefix a site-absolute path for `localePrefix: "always"`. */
export function localePath(locale: string, href: string) {
  const [pathname, search] = href.split("?");
  const prefixed = pathname === "/" ? `/${locale}` : `/${locale}${pathname}`;
  return search ? `${prefixed}?${search}` : prefixed;
}

/** Full document URL so middleware 307s (login) are followed instead of RSC error UI. */
export function documentHref(locale: string, href: string, hash?: string) {
  const path = localePath(locale, href);
  if (!hash) {
    return path;
  }
  return `${path}#${hash.replace(/^#/, "")}`;
}

/** HTML for these routes is edge-cached; a full document load is faster than RSC. */
export function isCachedMarketingPath(pathname: string) {
  return CACHED_MARKETING_PATHS.has(pathname);
}

export function cachedMarketingHref(locale: string, pathname: string, hash?: string) {
  return documentHref(locale, pathname, hash);
}
