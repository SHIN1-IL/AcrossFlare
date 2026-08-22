"use client";

import { useTranslations } from "next-intl";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { buttonVariants } from "@/components/ui/button";
import { useAdmin } from "@/hooks/use-admin";
import { Link } from "@/i18n/navigation";
import type { ProductId } from "@/lib/plans";
import { cn } from "@/lib/utils";

function ProductCard({ product }: { product: ProductId }) {
  const t = useTranslations("admin");
  const { plans, nodes, customers } = useAdmin();
  const planCount = plans.filter((plan) => plan.product === product).length;
  const nodeCount = nodes.filter((node) => node.product === product).length;
  const customerCount = customers.filter((customer) => customer.product === product).length;

  return (
    <article className="flex flex-col rounded-2xl border border-border bg-card p-5">
      <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">
        {product === "global" ? t("tabGlobal") : t("tabMarketing")}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        {product === "global" ? t("homeGlobalDesc") : t("homeMarketingDesc")}
      </p>
      <dl className="mt-5 grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">{t("statCustomers")}</dt>
          <dd className="mt-1 font-mono text-xl">{customerCount}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{t("statPlans")}</dt>
          <dd className="mt-1 font-mono text-xl">{planCount}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{t("statNodes")}</dt>
          <dd className="mt-1 font-mono text-xl">{nodeCount}</dd>
        </div>
      </dl>
      <Link
        href={`/admin/${product}/customers`}
        className={cn(buttonVariants(), "mt-6 rounded-[10px]")}
      >
        {t("open")}
      </Link>
    </article>
  );
}

export function AdminHome() {
  const t = useTranslations("admin");

  return (
    <div className="mx-auto max-w-4xl">
      <AdminPageHeader title={t("homeTitle")} subtitle={t("homeSubtitle")} />
      <div className="grid gap-4 md:grid-cols-2">
        <ProductCard product="global" />
        <ProductCard product="marketing" />
      </div>
    </div>
  );
}
