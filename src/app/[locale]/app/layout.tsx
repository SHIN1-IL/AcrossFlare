import { setRequestLocale } from "next-intl/server";
import { AppShell } from "@/components/app/app-shell";
import { getCurrentUser } from "@/lib/auth";
import { resolveLocale } from "@/i18n/locale";
import { redirect } from "@/i18n/navigation";

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) {
    redirect({ href: { pathname: "/login", query: { next: "/app" } }, locale });
  }

  return <AppShell>{children}</AppShell>;
}
