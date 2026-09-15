import { setRequestLocale } from "next-intl/server";
import { CustomerTable } from "@/components/admin/customer-table";
import { requireAdminPage } from "@/lib/admin-auth";
import { resolveAdminProduct } from "@/lib/admin-product";

export default async function AdminCustomersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; product: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { locale, service } = await resolveAdminProduct(params, "customers");
  const { status } = await searchParams;
  setRequestLocale(locale);
  await requireAdminPage(locale, "customers");
  return <CustomerTable service={service} status={status} />;
}
