import { hasLocale } from "next-intl";
import { routing, type AppLocale } from "@/i18n/routing";

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

const PROTECTED_SUFFIX = /^\/(app|admin|checkout|support|dashboard)(\/|$)/;

/** Prefix a site-absolute path for `localePrefix: "as-needed"`. */
export function localePath(locale: string, href: string) {
  const [pathname, search] = href.split("?");
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  const prefixed =
    pathname === "/" ? prefix || "/" : `${prefix}${pathname}`;
  return search ? `${prefixed}?${search}` : prefixed;
}

export function localeFromPathname(pathname: string): AppLocale {
  const first = pathname.split("/")[1];
  if (hasLocale(routing.locales, first)) {
    return first;
  }
  return routing.defaultLocale;
}

export function stripLocalePrefix(pathname: string) {
  const first = pathname.split("/")[1];
  if (!hasLocale(routing.locales, first)) {
    return pathname || "/";
  }
  const rest = pathname.slice(first.length + 1);
  return rest === "" ? "/" : rest;
}

export function isProtectedPath(pathname: string) {
  return PROTECTED_SUFFIX.test(stripLocalePrefix(pathname));
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
