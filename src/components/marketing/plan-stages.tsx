import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LazyStageBackdrop } from "@/components/marketing/plan-stage-bg";
import { PriceWithPeriod, SecondaryPriceAmount } from "@/components/marketing/price-amount";
import { buttonVariants } from "@/components/ui/button";
import { HOME_SLIDE_PLAN_IDS, HOME_SLIDE_PRICES, homeSlideFor } from "@/lib/marketing-services";
import { getPlanById, planPricePeriodKey, type Plan } from "@/lib/plans";
import { cn } from "@/lib/utils";
import type { AppLocale } from "@/i18n/routing";

export async function PlanStages({ showAlipay }: { showAlipay: boolean }) {
  const slides = HOME_SLIDE_PLAN_IDS.map((id) => getPlanById(id)).filter(
    (plan): plan is Plan => Boolean(plan)
  );
  const t = await getTranslations("pricing");
  const tSlides = await getTranslations("planSlides");
  const tWorkspace = await getTranslations("workspace");
  const locale = (await getLocale()) as AppLocale;

  return (
    <div>
      {slides.map((plan, index) => (
        <PlanStage
          key={plan.id}
          plan={plan}
          index={index}
          showAlipay={showAlipay}
          isFirst={index === 0}
          locale={locale}
          t={t}
          tSlides={tSlides}
          tWorkspace={tWorkspace}
        />
      ))}
      <WorkspaceStage index={slides.length} t={tWorkspace} />
    </div>
  );
}

function PlanStage({
  plan,
  index,
  showAlipay,
  isFirst,
  locale,
  t,
  tSlides,
  tWorkspace,
}: {
  plan: Plan;
  index: number;
  showAlipay: boolean;
  isFirst: boolean;
  locale: AppLocale;
  t: Awaited<ReturnType<typeof getTranslations>>;
  tSlides: Awaited<ReturnType<typeof getTranslations>>;
  tWorkspace: Awaited<ReturnType<typeof getTranslations>>;
}) {
  const slide = homeSlideFor(plan.id);
  const prices = HOME_SLIDE_PRICES[plan.id] ?? plan.prices;
  const custom =
    plan.id === "global-lite"
      ? {
          eyebrow: tSlides("global-lite.eyebrow"),
          title: tSlides("global-lite.title"),
          description: tSlides("global-lite.description"),
          cta: tSlides("global-lite.cta"),
        }
      : plan.id === "global-pro"
        ? {
            eyebrow: tSlides("global-pro.eyebrow"),
            title: tSlides("global-pro.title"),
            description: tSlides("global-pro.description"),
            cta: tSlides("global-pro.cta"),
          }
        : null;
  const service = slide.service;
  const productLabel = custom?.eyebrow ?? t(service);
  const traffic = plan.trafficGb === null ? t("unlimited") : `${plan.trafficGb} GB`;
  const period = t(planPricePeriodKey(plan.id, service));

  return (
    <section
      id={isFirst ? "plans" : undefined}
      className="relative h-dvh overflow-hidden"
    >
      <LazyStageBackdrop variant={index} />
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
          <PriceWithPeriod locale={locale} prices={prices} period={period} compact />
        </p>
        <SecondaryPriceAmount
          locale={locale}
          prices={prices}
          className="mt-1 font-mono text-xs text-muted-foreground"
        />
        {showAlipay ? (
          <p className="mt-2 text-xs text-primary">{t("alipay")}</p>
        ) : null}
        <Link
          href={slide.href}
          className={cn(buttonVariants({ size: "lg" }), "mt-8 rounded-[10px] px-8")}
        >
          {tWorkspace("learnMore")}
        </Link>
      </div>
    </section>
  );
}

function WorkspaceStage({
  index,
  t,
}: {
  index: number;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  return (
    <section className="relative h-dvh overflow-hidden">
      <LazyStageBackdrop variant={index} />
      <div className="relative z-10 mx-auto flex h-full w-full max-w-3xl flex-col items-center justify-end px-6 pb-[22vh] text-center">
        <p className="text-xs font-medium tracking-[0.22em] text-primary uppercase">
          {t("eyebrow")}
        </p>
        <h2 className="mt-3 text-4xl font-semibold tracking-tight md:text-6xl">
          {t("title")}
        </h2>
        <p className="mt-4 text-sm text-muted-foreground md:text-base">{t("description")}</p>
        <p className="mt-2 text-sm text-muted-foreground md:text-base">{t("hint")}</p>
        <Link
          href="/workspace"
          className={cn(buttonVariants({ size: "lg" }), "mt-8 rounded-[10px] px-8")}
        >
          {t("learnMore")}
        </Link>
      </div>
    </section>
  );
}
