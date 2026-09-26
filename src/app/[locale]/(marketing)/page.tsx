import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { HeroIntro } from "@/components/marketing/hero-intro";
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
      <section className="relative -mt-14 h-dvh snap-center snap-always overflow-hidden max-md:h-auto max-md:snap-none max-md:overflow-visible">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.12),transparent_55%)]" />
        <HeroIntro />
      </section>
      <Suspense fallback={<PlanStagesSkeleton />}>
        <PlanStages locale={locale} showAlipay={locale === "zh"} />
      </Suspense>
    </MarketingShell>
  );
}
