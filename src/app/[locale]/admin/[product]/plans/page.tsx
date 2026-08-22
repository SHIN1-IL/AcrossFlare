import { setRequestLocale } from "next-intl/server";
import { PlanManager } from "@/components/admin/plan-manager";
import { resolveAdminProduct } from "@/lib/admin-product";

export default async function AdminPlansPage({
  params,
}: {
  params: Promise<{ locale: string; product: string }>;
}) {
  const { locale, product } = await resolveAdminProduct(params);
  setRequestLocale(locale);
  return <PlanManager product={product} />;
}
