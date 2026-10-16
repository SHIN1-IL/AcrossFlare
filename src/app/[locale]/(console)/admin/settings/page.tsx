import { setRequestLocale } from "next-intl/server";
import { AdminSettings } from "@/components/admin/admin-settings";
import { requireAdminPage } from "@/lib/admin-auth";
import { resolveLocale } from "@/i18n/locale";

export default async function AdminSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);
  await requireAdminPage(locale);
  return <AdminSettings />;
}
