import { setRequestLocale } from "next-intl/server";
import { AdminShell } from "@/components/admin/admin-shell";
import { getCurrentUser } from "@/lib/auth";
import { isAdminSession } from "@/lib/auth-types";
import { resolveLocale } from "@/i18n/locale";
import { redirect } from "@/i18n/navigation";

export default async function AdminLayout({
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
    redirect({ href: { pathname: "/login", query: { next: "/admin" } }, locale });
  } else if (!isAdminSession(user)) {
    redirect({ href: "/app", locale });
  }

  return <AdminShell>{children}</AdminShell>;
}
