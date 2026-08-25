"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { StageBackdrop } from "@/components/marketing/plan-stage-bg";
import { buttonVariants } from "@/components/ui/button";
import { useLivePlans } from "@/hooks/use-admin";
import { formatPrimaryPrice, formatSecondaryPrice } from "@/lib/format-price";
import type { Plan } from "@/lib/plans";
import { cn } from "@/lib/utils";
import type { AppLocale } from "@/i18n/routing";

export function PlanStages({ showAlipay }: { showAlipay: boolean }) {
  const globalPlans = useLivePlans("global");
  const slides = globalPlans.filter(
    (plan) => plan.id === "global-lite" || plan.id === "global-pro"
  );

  return (
    <div>
      {slides.map((plan, index) => (
        <PlanStage
          key={plan.id}
          plan={plan}
          index={index}
          showAlipay={showAlipay}
          isFirst={index === 0}
        />
      ))}
    </div>
  );
}

function PlanStage({
  plan,
  index,
  showAlipay,
  isFirst,
}: {
  plan: Plan;
  index: number;
  showAlipay: boolean;
  isFirst: boolean;
}) {
  const t = useTranslations("pricing");
  const tSlides = useTranslations("planSlides");
  const locale = useLocale() as AppLocale;
  const secondary = formatSecondaryPrice(locale, plan.prices);
  const slideKey = `${plan.id}.title`;
  const custom = tSlides.has(slideKey)
    ? {
        eyebrow: tSlides(`${plan.id}.eyebrow`),
        title: tSlides(`${plan.id}.title`),
        description: tSlides(`${plan.id}.description`),
        price: tSlides(`${plan.id}.price`),
        cta: tSlides(`${plan.id}.cta`),
      }
    : null;
  const productLabel = custom?.eyebrow ?? (plan.product === "global" ? t("global") : t("marketing"));
  const traffic = plan.trafficGb === null ? t("unlimited") : `${plan.trafficGb} GB`;

  return (
    <section
      id={isFirst ? "plans" : undefined}
      className="relative h-dvh overflow-hidden"
    >
      <StageBackdrop variant={index} />
      <div className="relative z-10 mx-auto flex h-full w-full max-w-3xl flex-col items-center justify-end px-6 pb-[22vh] text-center">
        <p className="text-xs font-medium tracking-[0.22em] text-primary uppercase">
          {productLabel}
        </p>
        <h2 className="mt-3 text-4xl font-semibold tracking-tight md:text-6xl">
          {custom?.title ?? plan.name}
        </h2>
        <p className="mt-4 text-sm text-muted-foreground md:text-base">
          {custom?.description ??
            `${t("traffic")} ${traffic} · ${t("nodes")} ${plan.nodes.join(" · ")}${
              plan.backupGb !== null ? ` · ${t("backup")} ${plan.backupGb} GB` : ""
            }`}
        </p>
        <p className="mt-6 font-mono text-3xl tracking-tight md:text-4xl">
          {custom?.price ?? (
            <>
              {formatPrimaryPrice(locale, plan.prices)}
              <span className="ml-2 text-sm text-muted-foreground">{t("perMonth")}</span>
            </>
          )}
        </p>
        {!custom && secondary ? (
          <p className="mt-1 font-mono text-xs text-muted-foreground">{secondary}</p>
        ) : null}
        {showAlipay ? (
          <p className="mt-2 text-xs text-primary">{t("alipay")}</p>
        ) : null}
        <Link
          href={{
            pathname: "/checkout",
            query: { product: plan.product, plan: plan.id },
          }}
          className={cn(buttonVariants({ size: "lg" }), "mt-8 rounded-[10px] px-8")}
        >
          {custom?.cta ?? t("cta")}
        </Link>
      </div>
    </section>
  );
}
