import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { HeroGrain } from "@/components/marketing/hero-grain";
import { HeroIntro } from "@/components/marketing/hero-intro";
import { HomePageSnap } from "@/components/marketing/home-page-snap";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { PlanStages, PlanStagesSkeleton } from "@/components/marketing/plan-stages";

export const revalidate = 86400;

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);

  return (
    <MarketingShell deck>
      <HomePageSnap />
      <section className="relative -mt-14 h-dvh snap-center snap-always overflow-hidden bg-[#14181e] max-[479px]:h-auto max-[479px]:snap-none max-[479px]:overflow-visible">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(226,232,240,0.07),transparent_34%,rgba(0,0,0,0.2)),repeating-linear-gradient(90deg,rgba(255,255,255,0.045)_0px,rgba(255,255,255,0.045)_1px,transparent_1px,transparent_5px)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.1),transparent_55%)]" />
        <HeroGrain />
        <HeroIntro />
      </section>
      <Suspense fallback={<PlanStagesSkeleton />}>
        <PlanStages locale={locale} showAlipay={locale === "zh"} />
      </Suspense>
    </MarketingShell>
  );
}
