import { setRequestLocale } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { BillingView } from "@/components/app/billing-view";

export default async function BillingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);
  return <BillingView />;
}
