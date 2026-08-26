import { setRequestLocale } from "next-intl/server";
import { StaffManager } from "@/components/admin/staff-manager";
import { requireAdminPage } from "@/lib/admin-auth";
import { resolveLocale } from "@/i18n/locale";

export default async function AdminStaffPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);
  await requireAdminPage(locale, "owner");
  return <StaffManager />;
}
