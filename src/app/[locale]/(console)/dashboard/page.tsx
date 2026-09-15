import { setRequestLocale } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { BackupDashboard } from "@/components/app/backup-dashboard";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);
  return <BackupDashboard />;
}
