import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { CachedMarketingLink } from "@/components/marketing/cached-marketing-link";
import { PriceAmount, SecondaryPriceAmount } from "@/components/marketing/price-amount";
import { publicServiceFromPlanId, publicServiceHref } from "@/lib/public-service";
import { planHasPrice, planTerm, planTrafficQuota, type Plan } from "@/lib/plans";
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
  const service = publicServiceFromPlanId(plan.id);
  const priced = planHasPrice(plan);
  const browse = service === "workspace" || !priced;
  const period =
    planTerm(plan.id) === "week"
      ? t("periodWeek")
      : planTerm(plan.id) === "year"
        ? t("periodYear")
        : t("periodMonth");

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
          {priced ? (
            <>
              <div className="mt-2 flex items-end gap-2">
                <p className="font-mono text-3xl tracking-tight text-foreground">
                  <PriceAmount locale={locale} prices={plan.prices} />
                </p>
                <span className="mb-1 text-xs text-muted-foreground">{period}</span>
              </div>
              <SecondaryPriceAmount
                locale={locale}
                prices={plan.prices}
                className="mt-1 font-mono text-xs text-muted-foreground"
              />
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">{t("inquire")}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          {plan.featured ? (
            <Badge variant="secondary" className="rounded-md bg-primary/15 text-primary">
              {t("featured")}
            </Badge>
          ) : null}
          {showAlipay && priced ? (
            <Badge variant="outline" className="rounded-md border-primary/30 text-primary">
              {t("alipay")}
            </Badge>
          ) : null}
        </div>
      </div>

      {priced ? (
        <dl className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">{t("traffic")}</dt>
            <dd className="font-mono">{formatTrafficQuota(plan, t)}</dd>
          </div>
          {plan.backupGb !== null ? (
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">{t("backup")}</dt>
              <dd className="font-mono">{plan.backupGb} GB</dd>
            </div>
          ) : null}
          {plan.nodes.length ? (
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">{t("nodes")}</dt>
              <dd className="font-mono">{plan.nodes.join(" · ")}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      {browse ? (
        <CachedMarketingLink
          href={publicServiceHref(service)}
          className={cn(buttonVariants({ size: "lg" }), "mt-6 w-full rounded-[10px]")}
        >
          {t("viewService")}
        </CachedMarketingLink>
      ) : (
        <Link
          href={{
            pathname: "/checkout",
            query: { product: plan.product, plan: plan.id },
          }}
          className={cn(buttonVariants({ size: "lg" }), "mt-6 w-full rounded-[10px]")}
        >
          {t("cta")}
        </Link>
      )}
    </article>
  );
}

function formatTrafficQuota(plan: Plan, t: (key: "unlimited" | "quotaMonth" | "quotaTotal") => string) {
  const quota = planTrafficQuota(plan);
  if (!quota) {
    return t("unlimited");
  }

  const prefix = quota.cadence === "month" ? t("quotaMonth") : t("quotaTotal");
  return `${prefix} ${quota.gb}GB`;
}
