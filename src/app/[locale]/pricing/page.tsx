import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { PricingView } from "@/components/marketing/pricing-view";
import { pricingServiceFromQuery } from "@/lib/marketing-services";
import { loadAllStorefrontPlansByService } from "@/lib/storefront-plans";

export const dynamic = "force-dynamic";

export default async function PricingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ product?: string }>;
}) {
  const locale = await resolveLocale(params);
  const { product } = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations("pricing");
  const currentLocale = await getLocale();
  const initialService = pricingServiceFromQuery(product);
  const plansByService = await loadAllStorefrontPlansByService();

  return (
    <MarketingShell>
      <div className="mx-auto max-w-6xl px-4 py-16">
        <h1 className="text-3xl tracking-tight md:text-4xl">{t("title")}</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">{t("subtitle")}</p>
        <div className="mt-10">
          <PricingView
            initialService={initialService}
            plansByService={plansByService}
            showAlipay={currentLocale === "zh"}
          />
        </div>
      </div>
    </MarketingShell>
  );
}
