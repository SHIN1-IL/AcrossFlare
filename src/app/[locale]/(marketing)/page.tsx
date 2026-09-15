import { getLocale, setRequestLocale } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { HeroAtmosphereLazy } from "@/components/marketing/hero-atmosphere-lazy";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { PlanStages } from "@/components/marketing/plan-stages";
import { STOREFRONT_REVALIDATE_SECONDS } from "@/lib/http-cache";

export const revalidate = 86400;

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);
  const currentLocale = await getLocale();

  return (
    <MarketingShell>
      <section className="relative -mt-14 flex h-dvh flex-col items-center justify-center overflow-hidden text-center">
        <HeroAtmosphereLazy />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.12),transparent_55%)]" />
        <div className="relative z-10 inline-block px-[clamp(1.25rem,4vw,2.5rem)]">
          <h1 className="text-[clamp(3.5rem,14vw,9rem)] font-semibold tracking-[-0.04em] leading-[0.95]">
            AcrossFlare
          </h1>
          <p className="mt-6 text-[clamp(0.8125rem,2.2vw,1.25rem)] whitespace-nowrap text-[#888888]">
            Secure Cloud & Network Optimization
          </p>
        </div>
      </section>
      <PlanStages showAlipay={currentLocale === "zh"} />
    </MarketingShell>
  );
}
