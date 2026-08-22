import { setRequestLocale } from "next-intl/server";
import { CustomerTable } from "@/components/admin/customer-table";
import { resolveAdminProduct } from "@/lib/admin-product";

export default async function AdminCustomersPage({
  params,
}: {
  params: Promise<{ locale: string; product: string }>;
}) {
  const { locale, product } = await resolveAdminProduct(params);
  setRequestLocale(locale);
  return <CustomerTable product={product} />;
}
