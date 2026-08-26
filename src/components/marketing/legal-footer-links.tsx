"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function LegalFooterLinks({ className }: { className?: string }) {
  const t = useTranslations("footer");

  return (
    <nav className={cn("flex flex-wrap gap-4 text-muted-foreground", className)}>
      <Link href="/terms" className="transition-colors hover:text-foreground">
        {t("terms")}
      </Link>
      <Link href="/privacy" className="transition-colors hover:text-foreground">
        {t("privacy")}
      </Link>
      <Link
        href={{ pathname: "/terms", hash: "refund" }}
        className="transition-colors hover:text-foreground"
      >
        {t("refund")}
      </Link>
    </nav>
  );
}
