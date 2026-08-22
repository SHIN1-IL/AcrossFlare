import { setRequestLocale } from "next-intl/server";
import { AdminHome } from "@/components/admin/admin-home";
import { resolveLocale } from "@/i18n/locale";

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);
  return <AdminHome />;
}
