import { setRequestLocale } from "next-intl/server";
import { CustomerDetail } from "@/components/admin/customer-detail";
import { requireAdminPage } from "@/lib/admin-auth";
import { resolveAdminProduct } from "@/lib/admin-product";

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ locale: string; product: string; id: string }>;
}) {
  const { id } = await params;
  const { locale, service } = await resolveAdminProduct(params, `customers/${id}`);
  setRequestLocale(locale);
  await requireAdminPage(locale, "customers");
  return <CustomerDetail service={service} id={id} />;
}
