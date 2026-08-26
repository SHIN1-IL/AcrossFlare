import { setRequestLocale } from "next-intl/server";
import { CustomerDetail } from "@/components/admin/customer-detail";
import { requireAdminPage } from "@/lib/admin-auth";
import { resolveAdminProduct } from "@/lib/admin-product";

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ locale: string; product: string; id: string }>;
}) {
  const { locale, product } = await resolveAdminProduct(params);
  const { id } = await params;
  setRequestLocale(locale);
  await requireAdminPage(locale, "customers");
  return <CustomerDetail product={product} id={id} />;
}
