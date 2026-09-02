import { Suspense } from "react";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { PricingView } from "@/components/marketing/pricing-view";
import { loadAllStorefrontPlansByService } from "@/lib/storefront-plans";

export const revalidate = 3600;

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);

  const t = await getTranslations("pricing");
  const currentLocale = await getLocale();
  const plansByService = await loadAllStorefrontPlansByService();

  return (
    <MarketingShell>
      <div className="mx-auto max-w-6xl px-4 py-16">
        <h1 className="text-3xl tracking-tight md:text-4xl">{t("title")}</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">{t("subtitle")}</p>
        <div className="mt-10">
          <Suspense>
            <PricingView
              plansByService={plansByService}
              showAlipay={currentLocale === "zh"}
            />
          </Suspense>
        </div>
      </div>
    </MarketingShell>
  );
}
