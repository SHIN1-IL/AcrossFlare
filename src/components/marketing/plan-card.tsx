import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatPrimaryPrice, formatSecondaryPrice } from "@/lib/format-price";
import type { Plan } from "@/lib/plans";
import { cn } from "@/lib/utils";
import type { AppLocale } from "@/i18n/routing";

export function PlanCard({
  plan,
  showAlipay,
}: {
  plan: Plan;
  showAlipay: boolean;
}) {
  const t = useTranslations("pricing");
  const locale = useLocale() as AppLocale;
  const secondary = formatSecondaryPrice(locale, plan.prices);

  return (
    <article
      className={cn(
        "flex flex-col rounded-2xl border bg-card p-5",
        plan.featured ? "border-primary/40" : "border-border"
      )}
    >
      <div className="mb-5 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm text-muted-foreground">{plan.name}</p>
          <div className="mt-2 flex items-end gap-2">
            <p className="font-mono text-3xl tracking-tight text-foreground">
              {formatPrimaryPrice(locale, plan.prices)}
            </p>
            <span className="mb-1 text-xs text-muted-foreground">{t("perMonth")}</span>
          </div>
          {secondary ? (
            <p className="mt-1 font-mono text-xs text-muted-foreground">{secondary}</p>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-1">
          {plan.featured ? (
            <Badge variant="secondary" className="rounded-md bg-primary/15 text-primary">
              {t("featured")}
            </Badge>
          ) : null}
          {showAlipay ? (
            <Badge variant="outline" className="rounded-md border-primary/30 text-primary">
              {t("alipay")}
            </Badge>
          ) : null}
        </div>
      </div>

      <dl className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">{t("traffic")}</dt>
          <dd className="font-mono">
            {plan.trafficGb === null ? t("unlimited") : `${plan.trafficGb} GB`}
          </dd>
        </div>
        {plan.backupGb !== null ? (
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">{t("backup")}</dt>
            <dd className="font-mono">{plan.backupGb} GB</dd>
          </div>
        ) : null}
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">{t("nodes")}</dt>
          <dd className="font-mono">{plan.nodes.join(" · ")}</dd>
        </div>
      </dl>

      <Link
        href={{
          pathname: "/checkout",
          query: { product: plan.product, plan: plan.id },
        }}
        className={cn(buttonVariants({ size: "lg" }), "mt-6 w-full rounded-[10px]")}
      >
        {t("cta")}
      </Link>
    </article>
  );
}
