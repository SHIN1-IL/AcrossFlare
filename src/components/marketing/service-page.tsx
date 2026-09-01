import { getLocale, setRequestLocale } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { ProductNotice } from "@/components/marketing/product-notice";
import { ServiceDetail } from "@/components/marketing/service-detail";
import { type MarketingServiceId } from "@/lib/marketing-services";
import { loadStorefrontPlansForService } from "@/lib/storefront-plans";

export async function ServicePage({
  params,
  service,
}: {
  params: Promise<{ locale: string }>;
  service: MarketingServiceId;
}) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);
  const currentLocale = await getLocale();
  const plans = await loadStorefrontPlansForService(service);

  return (
    <MarketingShell>
      <ServiceDetail service={service} plans={plans} showAlipay={currentLocale === "zh"} />
      <ProductNotice service={service} />
    </MarketingShell>
  );
}
