import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { AdminAuthShell } from "@/components/auth/admin-auth-shell";
import { AdminShellLoading } from "@/components/admin/shell-loading";
import { resolveLocale } from "@/i18n/locale";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);

  return (
    <Suspense fallback={<AdminShellLoading />}>
      <AdminAuthShell locale={locale}>{children}</AdminAuthShell>
    </Suspense>
  );
}
