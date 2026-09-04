import { setRequestLocale } from "next-intl/server";
import { AdminAuthShell } from "@/components/auth/admin-auth-shell";
import { resolveLocale } from "@/i18n/locale";

export const dynamic = "force-static";
export const revalidate = 3600;

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);

  return <AdminAuthShell>{children}</AdminAuthShell>;
}
