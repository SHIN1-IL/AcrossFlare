/** Prefix a site-absolute path for `localePrefix: "always"`. */
export function localePath(locale: string, href: string) {
  const [pathname, search] = href.split("?");
  const prefixed = pathname === "/" ? `/${locale}` : `/${locale}${pathname}`;
  return search ? `${prefixed}?${search}` : prefixed;
}
