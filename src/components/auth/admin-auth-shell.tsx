import { AdminShell } from "@/components/admin/admin-shell";
import { SessionProvider } from "@/components/auth/session-provider";
import { getCurrentUser } from "@/lib/auth";
import { isAdminSession } from "@/lib/auth-types";
import { redirect } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

export async function AdminAuthShell({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: AppLocale;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect({ href: { pathname: "/login", query: { next: "/admin" } }, locale });
    return null;
  } else if (!isAdminSession(user)) {
    redirect({ href: "/app", locale });
    return null;
  }

  return (
    <SessionProvider initialSession={user}>
      <AdminShell>{children}</AdminShell>
    </SessionProvider>
  );
}
