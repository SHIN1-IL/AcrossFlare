import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { HomePageSnap } from "@/components/marketing/home-page-snap";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { PlanStages, PlanStagesSkeleton } from "@/components/marketing/plan-stages";
import { ConsoleKaringStory } from "@/components/marketing/console-karing-story";
import { SpiderWebLanding } from "@/components/marketing/spider-web-landing";
import { WhyBuyUiStoryPreview } from "@/components/marketing/why-buy-ui-story-preview";

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
      <WhyBuyUiStoryPreview live />
      <ConsoleKaringStory />
      <Suspense fallback={<PlanStagesSkeleton />}>
        <PlanStages locale={locale} showAlipay={locale === "zh"} />
      </Suspense>
    </MarketingShell>
  );
}
