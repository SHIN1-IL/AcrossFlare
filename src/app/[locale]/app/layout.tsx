import { setRequestLocale } from "next-intl/server";
import { AppAuthShell } from "@/components/auth/app-auth-shell";
import { resolveLocale } from "@/i18n/locale";

export const dynamic = "force-static";
export const revalidate = 3600;

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);

  return <AppAuthShell>{children}</AppAuthShell>;
}
