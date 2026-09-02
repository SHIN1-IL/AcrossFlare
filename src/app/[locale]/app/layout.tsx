import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { AppAuthShell } from "@/components/auth/app-auth-shell";
import { AppShellLoading } from "@/components/app/shell-loading";
import { resolveLocale } from "@/i18n/locale";

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);

  return (
    <Suspense fallback={<AppShellLoading />}>
      <AppAuthShell locale={locale} nextPath="/app">
        {children}
      </AppAuthShell>
    </Suspense>
  );
}
