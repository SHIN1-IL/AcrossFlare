import { setRequestLocale } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { AppHome } from "@/components/app/app-home";

export default async function AppHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);
  return <AppHome />;
}
