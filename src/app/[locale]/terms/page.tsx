import { setRequestLocale } from "next-intl/server";
import { LegalPage } from "@/components/marketing/legal-page";
import { resolveLocale } from "@/i18n/locale";
export const revalidate = 3600;

export default async function TermsRoute({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);
  return <LegalPage doc="terms" />;
}
