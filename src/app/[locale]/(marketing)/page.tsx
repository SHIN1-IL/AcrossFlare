import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { DeferredConsoleKaring, DeferredWhyBuyLive } from "@/components/marketing/deferred-home-stories";
import { HomePitchDestination } from "@/components/marketing/home-pitch-destination";
import { HomePageSnap } from "@/components/marketing/home-page-snap";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { PlanStages, PlanStagesSkeleton } from "@/components/marketing/plan-stages";
import { SpiderWebLanding } from "@/components/marketing/spider-web-landing";

export const revalidate = 86400;

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);

  return (
    <MarketingShell deck footer={false}>
      <HomePageSnap />
      <SpiderWebLanding variant="dust" />
      <HomePitchDestination />
      <DeferredWhyBuyLive />
      <DeferredConsoleKaring />
      <Suspense fallback={<PlanStagesSkeleton />}>
        <PlanStages locale={locale} showAlipay={locale === "zh"} />
      </Suspense>
      <section
        data-home-page
        className="flex h-dvh snap-center snap-always flex-col overflow-hidden bg-[#14181e] max-md:snap-start"
      >
        <SpiderWebLanding variant="video" compact />
        <MarketingFooter compact />
      </section>
    </MarketingShell>
  );
}
