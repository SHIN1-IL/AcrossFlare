import { setRequestLocale } from "next-intl/server";
import { NodeManager } from "@/components/admin/node-manager";
import { resolveAdminProduct } from "@/lib/admin-product";

export default async function AdminNodesPage({
  params,
}: {
  params: Promise<{ locale: string; product: string }>;
}) {
  const { locale, product } = await resolveAdminProduct(params);
  setRequestLocale(locale);
  return <NodeManager product={product} />;
}
