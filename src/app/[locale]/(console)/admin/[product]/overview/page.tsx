import { setRequestLocale } from "next-intl/server";
import { AdminOverview } from "@/components/admin/admin-overview";
import { requireAdminPage } from "@/lib/admin-auth";
import { firstAdminPath } from "@/lib/admin-nav";
import { isOwnerRole } from "@/lib/admin-permissions";
import { resolveAdminProduct } from "@/lib/admin-product";
import { redirect } from "@/i18n/navigation";

export default async function AdminOverviewPage({
  params,
}: {
  params: Promise<{ locale: string; product: string }>;
}) {
  const { locale, service } = await resolveAdminProduct(params, "overview");
  setRequestLocale(locale);
  const user = await requireAdminPage(locale);
  const canSee = user.permissions.includes("customers") || user.permissions.includes("nodes");
  if (!canSee) {
    redirect({
      href: firstAdminPath(service, user.permissions, isOwnerRole(user.role)),
      locale,
    });
  }
  return <AdminOverview service={service} />;
}
