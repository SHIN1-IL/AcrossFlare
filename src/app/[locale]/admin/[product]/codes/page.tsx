import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { PromoCodeManager } from "@/components/admin/promo-code-manager";
import { requireAdminPage } from "@/lib/admin-auth";
import { resolveAdminProduct } from "@/lib/admin-product";

export default async function AdminCodesPage({
  params,
}: {
  params: Promise<{ locale: string; product: string }>;
}) {
  const { locale, service } = await resolveAdminProduct(params, "codes");
  setRequestLocale(locale);
  await requireAdminPage(locale, "codes");
  if (service !== "workspace") {
    redirect({ href: `/admin/${service}/customers`, locale });
  }
  return <PromoCodeManager />;
}
