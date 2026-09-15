import { setRequestLocale } from "next-intl/server";
import { PlanManager } from "@/components/admin/plan-manager";
import { requireAdminPage } from "@/lib/admin-auth";
import { resolveAdminProduct } from "@/lib/admin-product";

export default async function AdminPlansPage({
  params,
}: {
  params: Promise<{ locale: string; product: string }>;
}) {
  const { locale, service } = await resolveAdminProduct(params, "plans");
  setRequestLocale(locale);
  await requireAdminPage(locale, "plans");
  return <PlanManager service={service} />;
}
