import { AppShell } from "@/components/app/app-shell";
import { AccountBootstrap } from "@/components/auth/account-bootstrap";
import { SessionProvider } from "@/components/auth/session-provider";
import { MerchantDisclosure } from "@/components/marketing/merchant-disclosure";
import { loadAccountSnapshot } from "@/lib/account-from-db";
import { getAuthUser } from "@/lib/auth";
import { toPublicSession } from "@/lib/auth-types";
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
  const user = await getAuthUser();
  if (!user) {
    redirect({ href: { pathname: "/login", query: { next: nextPath } }, locale });
    return null;
  }

  const session = toPublicSession(user);

  // Prefer SSR hydrate; on DB/timeout failure the client fetches /api/v1/account.
  let account = null;
  try {
    account = await loadAccountSnapshot(user.email, user.id);
  } catch {
    account = null;
  }

  return (
    <SessionProvider initialSession={session}>
      <AccountBootstrap initialAccount={account}>
        <AppShell merchant={<MerchantDisclosure />}>{children}</AppShell>
      </AccountBootstrap>
    </SessionProvider>
  );
}
