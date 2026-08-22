import { setRequestLocale } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { GlobalDashboard } from "@/components/app/global-dashboard";

export default async function GlobalAppPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);
  return <GlobalDashboard />;
}
