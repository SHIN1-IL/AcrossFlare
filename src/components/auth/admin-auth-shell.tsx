import { AdminShell } from "@/components/admin/admin-shell";
import { AdminBootstrap } from "@/components/auth/admin-bootstrap";
import { SessionProvider } from "@/components/auth/session-provider";
import { listAdminState } from "@/lib/admin-data";
import { filterAdminState } from "@/lib/admin-permissions";
import { getAuthUser } from "@/lib/auth";
import { toPublicSession, isAdminSession } from "@/lib/auth-types";
import { redirect } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

export async function AdminAuthShell({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: AppLocale;
}) {
  const user = await getAuthUser();
  if (!user) {
    redirect({ href: { pathname: "/login", query: { next: "/admin" } }, locale });
    return null;
  }

  const session = toPublicSession(user);
  if (!isAdminSession(session)) {
    redirect({ href: "/app", locale });
    return null;
  }

  // Prefer SSR hydrate; on DB/timeout failure the client fetches /api/v1/admin/state.
  let initialState = null;
  try {
    initialState = filterAdminState(await listAdminState(), user.permissions);
  } catch {
    initialState = null;
  }

  return (
    <SessionProvider initialSession={session}>
      <AdminBootstrap initialState={initialState}>
        <AdminShell>{children}</AdminShell>
      </AdminBootstrap>
    </SessionProvider>
  );
}
