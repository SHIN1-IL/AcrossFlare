"use client";

import type { ComponentProps } from "react";
import { useLocale } from "next-intl";
import { cachedMarketingHref } from "@/i18n/path";

export function CachedMarketingLink({
  href,
  hash,
  children,
  ...props
}: Omit<ComponentProps<"a">, "href"> & {
  href: string;
  hash?: string;
}) {
  const locale = useLocale();

  return (
    <a href={cachedMarketingHref(locale, href, hash)} {...props}>
      {children}
    </a>
  );
}
