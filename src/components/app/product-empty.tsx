"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { StatusPill } from "@/components/app/status-pill";
import { cn } from "@/lib/utils";
import type { ProductId } from "@/lib/plans";

export function ProductEmpty({
  product,
}: {
  product: ProductId;
}) {
  const t = useTranslations("app");
  const plan = product === "global" ? "global-standard" : "marketing-standard";

  return (
    <div className="rounded-2xl border border-border bg-card p-8">
      <StatusPill label={t("statusUnpaid")} tone="warn" />
      <h2 className="mt-4 text-xl tracking-tight">{t("unpaidTitle")}</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{t("unpaidBody")}</p>
      <Link
        href={{ pathname: "/checkout", query: { product, plan } }}
        className={cn(buttonVariants(), "mt-6 rounded-[10px]")}
      >
        {t("unpaidCta")}
      </Link>
    </div>
  );
}

export function IssuingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-24 animate-pulse rounded-2xl bg-muted" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-56 animate-pulse rounded-2xl bg-muted" />
        <div className="h-56 animate-pulse rounded-2xl bg-muted" />
      </div>
    </div>
  );
}
