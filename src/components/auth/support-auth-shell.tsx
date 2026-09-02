import { SupportZone } from "@/components/marketing/support-zone";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

export async function SupportAuthShell({ locale }: { locale: AppLocale }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect({ href: { pathname: "/login", query: { next: "/support" } }, locale });
    return null;
  }

  return <SupportZone />;
}
