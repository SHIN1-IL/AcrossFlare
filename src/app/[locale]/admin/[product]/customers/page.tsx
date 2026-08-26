import { setRequestLocale } from "next-intl/server";
import { CustomerTable } from "@/components/admin/customer-table";
import { requireAdminPage } from "@/lib/admin-auth";
import { resolveAdminProduct } from "@/lib/admin-product";

export default async function AdminCustomersPage({
  params,
}: {
  params: Promise<{ locale: string; product: string }>;
}) {
  const { locale, service } = await resolveAdminProduct(params, "customers");
  setRequestLocale(locale);
  await requireAdminPage(locale, "customers");
  return <CustomerTable service={service} />;
}
