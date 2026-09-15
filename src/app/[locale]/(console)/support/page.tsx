import { setRequestLocale } from "next-intl/server";
import { SupportAuthShell } from "@/components/auth/support-auth-shell";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { resolveLocale } from "@/i18n/locale";

export const dynamic = "force-static";
export const revalidate = 3600;

export default async function SupportRoute({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);

  return (
    <MarketingShell>
      <SupportAuthShell />
    </MarketingShell>
  );
}
