import { setRequestLocale } from "next-intl/server";
import { NodeManager } from "@/components/admin/node-manager";
import { requireAdminPage } from "@/lib/admin-auth";
import { resolveAdminProduct } from "@/lib/admin-product";

export default async function AdminNodesPage({
  params,
}: {
  params: Promise<{ locale: string; product: string }>;
}) {
  const { locale, product } = await resolveAdminProduct(params, "nodes");
  setRequestLocale(locale);
  await requireAdminPage(locale, "nodes");
  return <NodeManager product={product} />;
}
