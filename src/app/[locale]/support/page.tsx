import { setRequestLocale } from "next-intl/server";
import { SupportZone } from "@/components/marketing/support-zone";
import { getCurrentUser } from "@/lib/auth";
import { resolveLocale } from "@/i18n/locale";
import { redirect } from "@/i18n/navigation";

export default async function SupportRoute({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) {
    redirect({ href: { pathname: "/login", query: { next: "/support" } }, locale });
  }

  return <SupportZone />;
}
