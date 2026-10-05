import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { DeferredConsoleKaring, DeferredWhyBuyLive } from "@/components/marketing/deferred-home-stories";
import { HomePageSnap } from "@/components/marketing/home-page-snap";
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
    <MarketingShell deck>
      <HomePageSnap />
      <SpiderWebLanding />
      <DeferredWhyBuyLive />
      <DeferredConsoleKaring />
      <Suspense fallback={<PlanStagesSkeleton />}>
        <PlanStages locale={locale} showAlipay={locale === "zh"} />
      </Suspense>
    </MarketingShell>
  );
}
