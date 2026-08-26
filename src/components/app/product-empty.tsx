"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { StatusPill } from "@/components/app/status-pill";
import { cn } from "@/lib/utils";
import { isPublicCheckoutProduct, type ProductId } from "@/lib/plans";
import { publicServiceFromPlanId, publicServiceHref } from "@/lib/public-service";

export function ProductEmpty({
  product,
  status = "unpaid",
  planId,
}: {
  product: ProductId;
  status?: "unpaid" | "failed";
  planId?: string;
}) {
  const t = useTranslations("app");
  const failed = status === "failed";
  const browse = publicServiceHref(product === "workspace" ? "workspace" : publicServiceFromPlanId(planId));
  const retryPlan =
    planId ?? (product === "workspace" ? "workspace-a" : product === "marketing" ? "marketing-standard" : "global-lite");

  return (
    <div className="rounded-2xl border border-border bg-card p-8">
      <StatusPill label={failed ? t("statusFailed") : t("statusUnpaid")} tone="warn" />
      <h2 className="mt-4 text-xl tracking-tight">{failed ? t("failedTitle") : t("unpaidTitle")}</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {failed ? t("failedBody") : t("unpaidBody")}
      </p>
      <Link
        href={
          failed && isPublicCheckoutProduct(product)
            ? { pathname: "/checkout", query: { product, plan: retryPlan } }
            : browse
        }
        className={cn(buttonVariants(), "mt-6 rounded-[10px]")}
      >
        {failed ? t("failedCta") : t("unpaidCta")}
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
