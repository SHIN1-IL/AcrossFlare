"use client";

import { useTranslations } from "next-intl";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { buttonVariants } from "@/components/ui/button";
import { useAdmin } from "@/hooks/use-admin";
import { useSession } from "@/hooks/use-account";
import { Link } from "@/i18n/navigation";
import { isOwnerSession } from "@/lib/auth-types";
import { ADMIN_TAB_PRODUCTS, adminHomeDescKey, adminTabMessageKey, firstAdminPath } from "@/lib/admin-nav";
import { listCustomersForService, listNodesForService, listPlansForService } from "@/lib/admin-store";
import type { AdminServiceId } from "@/lib/admin-service";
import { cn } from "@/lib/utils";

function ProductCard({ service }: { service: AdminServiceId }) {
  const t = useTranslations("admin");
  const session = useSession();
  useAdmin();
  const permissions = session?.permissions ?? [];
  const href = firstAdminPath(service, permissions, isOwnerSession(session));
  const { catalog } = listPlansForService(service);
  const planCount = catalog.length;
  const nodeCount = listNodesForService(service).length;
  const customerCount = listCustomersForService(service).length;

  return (
    <article className="flex h-full flex-col rounded-2xl border border-border bg-card p-5">
      <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">
        {t(adminTabMessageKey(service))}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">{t(adminHomeDescKey(service))}</p>
      <dl className="mt-auto grid grid-cols-3 gap-3 pt-5 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">{t("statCustomers")}</dt>
          <dd className="mt-1 font-mono text-xl">{permissions.includes("customers") ? customerCount : "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{t("statPlans")}</dt>
          <dd className="mt-1 font-mono text-xl">{permissions.includes("plans") ? planCount : "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{t("statNodes")}</dt>
          <dd className="mt-1 font-mono text-xl">{permissions.includes("nodes") ? nodeCount : "—"}</dd>
        </div>
      </dl>
      <Link href={href} className={cn(buttonVariants(), "mt-6 rounded-[10px]")}>
        {t("open")}
      </Link>
    </article>
  );
}

export function AdminHome() {
  const t = useTranslations("admin");

  return (
    <div className="mx-auto max-w-5xl">
      <AdminPageHeader title={t("homeTitle")} subtitle={t("homeSubtitle")} />
      <div className="grid items-stretch gap-4 md:grid-cols-3">
        {ADMIN_TAB_PRODUCTS.map((service) => (
          <ProductCard key={service} service={service} />
        ))}
      </div>
    </div>
  );
}
