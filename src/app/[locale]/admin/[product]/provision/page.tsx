import { setRequestLocale } from "next-intl/server";
import { ProvisionPanel } from "@/components/admin/provision-panel";
import { resolveAdminProduct } from "@/lib/admin-product";

export default async function AdminProvisionPage({
  params,
}: {
  params: Promise<{ locale: string; product: string }>;
}) {
  const { locale, product } = await resolveAdminProduct(params);
  setRequestLocale(locale);
  return <ProvisionPanel product={product} />;
}
