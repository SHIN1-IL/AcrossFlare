"use client";

import type { ComponentProps } from "react";
import { useLocale } from "next-intl";
import { documentHref } from "@/i18n/path";

type DocumentLinkProps = Omit<ComponentProps<"a">, "href"> & {
  href: string;
  hash?: string;
};

/** Full document navigation so protected-route 307s become a real login page, not the error UI. */
export function DocumentLink({ href, hash, children, ...props }: DocumentLinkProps) {
  const locale = useLocale();

  return (
    <a href={documentHref(locale, href, hash)} {...props}>
      {children}
    </a>
  );
}

export function CachedMarketingLink(props: DocumentLinkProps) {
  return <DocumentLink {...props} />;
}
