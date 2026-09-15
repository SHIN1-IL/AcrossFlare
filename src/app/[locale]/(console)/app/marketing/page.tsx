import { setRequestLocale } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { MarketingDashboard } from "@/components/app/marketing-dashboard";

export default async function MarketingAppPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);
  return <MarketingDashboard />;
}
