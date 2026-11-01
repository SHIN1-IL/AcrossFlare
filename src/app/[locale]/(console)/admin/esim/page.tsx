import { setRequestLocale } from "next-intl/server";
import { EsimAdmin } from "@/components/admin/esim-admin";
import { requireAdminPage } from "@/lib/admin-auth";
import { resolveLocale } from "@/i18n/locale";

export default async function AdminEsimPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);
  await requireAdminPage(locale);
  return <EsimAdmin />;
}
