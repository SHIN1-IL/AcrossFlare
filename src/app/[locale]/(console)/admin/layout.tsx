import { setRequestLocale } from "next-intl/server";
import { AdminAuthShell } from "@/components/auth/admin-auth-shell";
import { SessionProvider } from "@/components/auth/session-provider";
import { getCurrentUser } from "@/lib/auth";
import { resolveLocale } from "@/i18n/locale";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);
  const session = await getCurrentUser();

  return (
    <SessionProvider initialSession={session}>
      <AdminAuthShell>{children}</AdminAuthShell>
    </SessionProvider>
  );
}
