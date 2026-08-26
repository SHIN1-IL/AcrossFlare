import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireAdminPage } from "@/lib/admin-auth";
import { firstAdminPath } from "@/lib/admin-nav";
import { resolveAdminProduct } from "@/lib/admin-product";
import { isOwnerRole } from "@/lib/admin-permissions";

export default async function AdminProductIndexPage({
  params,
}: {
  params: Promise<{ locale: string; product: string }>;
}) {
  const { locale, service } = await resolveAdminProduct(params);
  setRequestLocale(locale);
  const user = await requireAdminPage(locale);
  redirect({
    href: firstAdminPath(service, user.permissions, isOwnerRole(user.role)),
    locale,
  });
}
