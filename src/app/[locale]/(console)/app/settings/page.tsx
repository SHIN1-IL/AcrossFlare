import { setRequestLocale } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { SettingsView } from "@/components/app/settings-view";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);
  return <SettingsView />;
}
