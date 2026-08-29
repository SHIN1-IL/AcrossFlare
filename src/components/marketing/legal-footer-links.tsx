"use client";

import { useTranslations } from "next-intl";
import { CachedMarketingLink } from "@/components/marketing/cached-marketing-link";
import { cn } from "@/lib/utils";

export function LegalFooterLinks({ className }: { className?: string }) {
  const t = useTranslations("footer");

  return (
    <nav className={cn("flex flex-wrap gap-4 text-muted-foreground", className)}>
      <CachedMarketingLink href="/terms" className="transition-colors hover:text-foreground">
        {t("terms")}
      </CachedMarketingLink>
      <CachedMarketingLink href="/privacy" className="transition-colors hover:text-foreground">
        {t("privacy")}
      </CachedMarketingLink>
      <CachedMarketingLink
        href="/terms"
        hash="refund"
        className="transition-colors hover:text-foreground"
      >
        {t("refund")}
      </CachedMarketingLink>
    </nav>
  );
}
