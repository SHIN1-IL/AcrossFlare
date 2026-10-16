import { setRequestLocale } from "next-intl/server";
import { NodeManager } from "@/components/admin/node-manager";
import { requireAdminPage } from "@/lib/admin-auth";
import { resolveAdminProduct } from "@/lib/admin-product";
import type { NodeRole } from "@/lib/admin";

export default async function AdminNodesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; product: string }>;
  searchParams: Promise<{ bootstrap?: string; pool?: string; role?: string }>;
}) {
  const { locale, product } = await resolveAdminProduct(params, "nodes");
  const query = await searchParams;
  setRequestLocale(locale);
  await requireAdminPage(locale, "nodes");
  const role: NodeRole = query.role === "failover" ? "failover" : "primary";
  return (
    <NodeManager
      product={product}
      bootstrapRequest={
        query.bootstrap === "1" ? { poolId: query.pool ?? "", role } : null
      }
    />
  );
}
