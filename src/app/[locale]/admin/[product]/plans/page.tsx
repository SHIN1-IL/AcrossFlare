import { setRequestLocale } from "next-intl/server";
import { PlanManager } from "@/components/admin/plan-manager";
import { requireAdminPage } from "@/lib/admin-auth";
import { resolveAdminProduct } from "@/lib/admin-product";

export default async function AdminPlansPage({
  params,
}: {
  params: Promise<{ locale: string; product: string }>;
}) {
  const { locale, product } = await resolveAdminProduct(params);
  setRequestLocale(locale);
  await requireAdminPage(locale, "plans");
  return <PlanManager product={product} />;
}
