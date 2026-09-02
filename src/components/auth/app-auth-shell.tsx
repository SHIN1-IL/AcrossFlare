import { AppShell } from "@/components/app/app-shell";
import { SessionProvider } from "@/components/auth/session-provider";
import { MerchantDisclosure } from "@/components/marketing/merchant-disclosure";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

export async function AppAuthShell({
  children,
  locale,
  nextPath,
}: {
  children: React.ReactNode;
  locale: AppLocale;
  nextPath: string;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect({ href: { pathname: "/login", query: { next: nextPath } }, locale });
    return null;
  }

  return (
    <SessionProvider initialSession={user}>
      <AppShell merchant={<MerchantDisclosure />}>{children}</AppShell>
    </SessionProvider>
  );
}
