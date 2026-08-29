"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { StageBackdrop } from "@/components/marketing/plan-stage-bg";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PriceWithPeriod, SecondaryPriceAmount } from "@/components/marketing/price-amount";
import { getMarketingService, type MarketingServiceId } from "@/lib/marketing-services";
import {
  getPlanById,
  planHasPrice,
  planPricePeriodKey,
  planTerm,
  planTrafficQuota,
  type Plan,
} from "@/lib/plans";
import { cn } from "@/lib/utils";
import type { AppLocale } from "@/i18n/routing";

export function ServiceDetail({
  service: serviceId,
  showAlipay,
}: {
  service: MarketingServiceId;
  showAlipay: boolean;
}) {
  const t = useTranslations("services");
  const tPricing = useTranslations("pricing");
  const locale = useLocale() as AppLocale;
  const service = getMarketingService(serviceId);
  const plans = service.planIds
    .map((id) => getPlanById(id))
    .filter((plan): plan is Plan => Boolean(plan));
  const banners = plans.map((plan) => ({ key: plan.id, plan }));

  return (
    <section className="relative min-h-dvh">
      <StageBackdrop variant={service.backdrop} />
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-5xl flex-col items-center justify-end px-6 pt-24 pb-[12vh] text-center">
        <p className="text-xs font-medium tracking-[0.22em] text-primary uppercase">
          {t(`${service.id}.eyebrow`)}
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-6xl">
          {t(`${service.id}.title`)}
        </h1>
        <p className="mt-4 text-sm text-muted-foreground md:text-base">
          {t(`${service.id}.description`)}
        </p>
        <div className={cn("w-full", banners.length === 1 ? "mt-8 min-h-16 max-w-2xl" : "mt-6")} />
        <div className="mt-4 flex w-full justify-center">
          <div
            className={cn(
              "grid w-full gap-3",
              banners.length > 1 && "max-w-5xl grid-cols-3",
              banners.length === 1 && "max-w-sm"
            )}
          >
            {banners.map(({ key, plan }) => {
              const priced = planHasPrice(plan);
              const inquire = service.id === "workspace" && !priced;
              const quota = priced ? planTrafficQuota(plan) : null;
              return (
              <ServicePlanCard
                key={key}
                plan={plan}
                locale={locale}
                showAlipay={showAlipay && priced}
                compactPrice
                hidePrice={!priced}
                badge={planTerm(plan.id) === "week" ? t("trialPlan") : null}
                heading={
                  t.has(`${service.id}.headings.${plan.id}`)
                    ? t(`${service.id}.headings.${plan.id}`)
                    : null
                }
                inquire={inquire ? t("workspace.inquire") : null}
                quota={
                  quota
                    ? {
                        prefix:
                          quota.cadence === "month"
                            ? tPricing("quotaMonth")
                            : tPricing("quotaTotal"),
                        amount: `${quota.gb}GB`,
                      }
                    : null
                }
                features={t.raw(`${service.id}.features`)}
                cta={t(`${service.id}.cta`)}
                wrapCta={service.id === "workspace"}
                needsCode={service.id === "workspace"}
                period={priced ? tPricing(planPricePeriodKey(plan.id, service.id)) : null}
              />
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function ServicePlanCard({
  plan,
  locale,
  showAlipay,
  compactPrice,
  hidePrice,
  badge,
  heading,
  inquire,
  quota,
  features,
  cta,
  wrapCta,
  needsCode,
  period,
}: {
  plan: Plan;
  locale: AppLocale;
  showAlipay: boolean;
  compactPrice?: boolean;
  hidePrice?: boolean;
  badge?: string | null;
  heading?: string | null;
  inquire?: string | null;
  quota?: { prefix: string; amount: string } | null;
  features?: string[] | null;
  cta: string;
  wrapCta?: boolean;
  needsCode?: boolean;
  period: string | null;
}) {
  const tPricing = useTranslations("pricing");
  const items = Array.isArray(features) ? features : [];
  const buttonClass = cn(
    buttonVariants({ size: compactPrice ? "default" : "lg" }),
    "flex w-full justify-center text-center rounded-[10px]",
    compactPrice && "px-2 text-sm",
    wrapCta
      ? "h-auto min-h-8 whitespace-normal px-2 py-1.5 leading-snug"
      : "whitespace-nowrap"
  );

  return (
    <article className="relative flex min-w-0 flex-col items-center rounded-2xl border border-border bg-card/80 px-3 py-5 text-center backdrop-blur-sm">
      {badge ? (
        <p className="absolute top-2 left-3 text-[10px] font-medium leading-none tracking-wide text-orange-400 sm:text-[11px]">
          {badge}
        </p>
      ) : null}
      {heading ? (
        <p className="w-full text-center text-sm font-medium leading-snug sm:text-base">{heading}</p>
      ) : null}
      <div className={cn("flex min-h-12 w-full items-center justify-center", heading && "mt-3")}>
        <div className="w-full">
          <PriceLine
            locale={locale}
            prices={plan.prices}
            period={period}
            compact={compactPrice}
            quota={quota}
            hidePrice={hidePrice}
            inquire={inquire}
          />
          {hidePrice || inquire ? null : (
            <SecondaryPriceAmount
              locale={locale}
              prices={plan.prices}
              className="mt-1 justify-center font-mono text-xs text-muted-foreground"
            />
          )}
        </div>
      </div>
      {showAlipay ? <p className="mt-2 text-xs text-primary">{tPricing("alipay")}</p> : null}
      {items.length ? (
        <ul className="mt-4 w-full flex-1 space-y-2 px-0.5 text-left text-[11px] leading-snug text-muted-foreground sm:text-xs">
          {items.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="mt-[0.45em] size-1 shrink-0 rounded-full bg-primary/75" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <div className={cn("w-full", items.length ? "mt-auto pt-6" : "mt-6")}>
        {needsCode ? (
          <PromoCta planId={plan.id} product={plan.product} cta={cta} buttonClass={buttonClass} />
        ) : (
          <Link
            href={{
              pathname: "/checkout",
              query: { product: plan.product, plan: plan.id },
            }}
            className={buttonClass}
          >
            {cta}
          </Link>
        )}
      </div>
    </article>
  );
}

function PromoCta({
  planId,
  product,
  cta,
  buttonClass,
}: {
  planId: string;
  product: string;
  cta: string;
  buttonClass: string;
}) {
  const t = useTranslations("services");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(false);
    try {
      const response = await fetch("/api/v1/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, planId }),
      });
      const data = (await response.json()) as { code?: string; planId?: string };
      if (!response.ok || !data.code || data.planId !== planId) {
        setError(true);
        return;
      }

      router.push({
        pathname: "/checkout",
        query: { product, plan: planId, code: data.code },
      });
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className={buttonClass} onClick={() => setOpen(true)}>
        {cta}
      </button>
    );
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-2">
      <Input
        value={code}
        onChange={(event) => {
          setCode(event.target.value);
          setError(false);
        }}
        placeholder={t("workspace.codePlaceholder")}
        autoFocus
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        aria-invalid={error}
        className="h-8 rounded-[10px] text-center font-mono uppercase"
      />
      <button type="submit" className={buttonClass} disabled={pending}>
        {t("workspace.codeSubmit")}
      </button>
      {error ? <p className="text-xs text-destructive">{t("workspace.codeInvalid")}</p> : null}
    </form>
  );
}

function PriceLine({
  locale,
  prices,
  period,
  compact,
  quota,
  hidePrice,
  inquire,
}: {
  locale: AppLocale;
  prices: Plan["prices"];
  period: string | null;
  compact?: boolean;
  quota?: { prefix: string; amount: string } | null;
  hidePrice?: boolean;
  inquire?: string | null;
}) {
  if (inquire) {
    return (
      <p className="text-center text-sm font-medium leading-snug text-muted-foreground sm:text-base">
        {inquire}
      </p>
    );
  }

  return (
    <div
      className={cn(
        "flex w-full flex-col items-center font-mono tracking-tight",
        compact ? "text-lg sm:text-xl" : "text-2xl md:text-3xl"
      )}
    >
      <p className="flex h-[1.25em] items-baseline justify-center whitespace-nowrap">
        {hidePrice ? null : (
          <PriceWithPeriod
            locale={locale}
            prices={prices}
            period={period}
            compact={compact}
            amountClassName="text-primary"
          />
        )}
      </p>
      <p className="mt-1 h-[1em] text-center text-base font-medium leading-none text-blue-400 sm:text-lg">
        {hidePrice || !quota ? null : `${quota.prefix} ${quota.amount}`}
      </p>
    </div>
  );
}
