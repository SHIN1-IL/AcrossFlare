import { setRequestLocale } from "next-intl/server";
import { ProvisionPanel } from "@/components/admin/provision-panel";
import { requireAdminPage } from "@/lib/admin-auth";
import { resolveAdminProduct } from "@/lib/admin-product";

export default async function AdminProvisionPage({
  params,
}: {
  params: Promise<{ locale: string; product: string }>;
}) {
  const { locale, product } = await resolveAdminProduct(params);
  setRequestLocale(locale);
  await requireAdminPage(locale, "provision");
  return <ProvisionPanel product={product} />;
}
