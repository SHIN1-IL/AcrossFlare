"use client";

import { useTranslations } from "next-intl";
import { CapacityAlerts } from "@/components/admin/capacity-alerts";
import { OpsHealthPanel } from "@/components/admin/ops-health";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { buttonVariants } from "@/components/ui/button";
import { useAdmin } from "@/hooks/use-admin";
import { useSession } from "@/hooks/use-account";
import { Link } from "@/i18n/navigation";
import { isOwnerSession } from "@/lib/auth-types";
import { ADMIN_TAB_PRODUCTS, adminHomeDescKey, adminTabMessageKey, firstAdminPath } from "@/lib/admin-nav";
import { poolsForAdminService } from "@/lib/admin-overview";
import { listCustomersForService, listNodesForService, listPlansForService } from "@/lib/admin-store";
import { adminQueueCounts } from "@/lib/admin-queue";
import type { AdminServiceId } from "@/lib/admin-service";
import { cn } from "@/lib/utils";

function ProductCard({ service }: { service: AdminServiceId }) {
  const t = useTranslations("admin");
  const session = useSession();
  const { capacityPools } = useAdmin();
  const permissions = session?.permissions ?? [];
  const pools = poolsForAdminService(service, capacityPools ?? []);
  const seatsRemaining = pools.reduce((sum, pool) => sum + pool.seatsRemaining, 0);
  const canSeeSeats = permissions.includes("customers") || permissions.includes("nodes");
  const href = firstAdminPath(service, permissions, isOwnerSession(session));
  const { catalog } = listPlansForService(service);
  const planCount = catalog.length;
  const nodeCount = listNodesForService(service).length;
  const customers = listCustomersForService(service);
  const customerCount = customers.length;
  const queue = adminQueueCounts(customers);
  const queueItems = (
    [
      ["failed", queue.failed],
      ["provisioning", queue.provisioning],
      ["unpaid", queue.unpaid],
      ["expiring", queue.expiring],
    ] as const
  ).filter(([, count]) => count > 0);

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
      {permissions.includes("customers") && queueItems.length ? (
        <div className="mt-4 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">{t("needsAttention")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {queueItems.map(([filter, count]) => (
              <Link
                key={filter}
                href={{ pathname: `/admin/${service}/customers`, query: { status: filter } }}
                className="rounded-md border border-border px-2 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {t(
                  filter === "failed"
                    ? "filterFailed"
                    : filter === "provisioning"
                      ? "filterProvisioning"
                      : filter === "unpaid"
                        ? "filterUnpaid"
                        : "filterExpiring"
                )}{" "}
                {count}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
      {canSeeSeats && pools.length ? (
        <p className="mt-4 font-mono text-xs text-muted-foreground">
          {t("overviewSeatCount", { count: seatsRemaining })}
        </p>
      ) : null}
      <Link href={href} className={cn(buttonVariants(), "mt-6 rounded-[10px]")}>
        {t("open")}
      </Link>
    </article>
  );
}

export function AdminHome() {
  const t = useTranslations("admin");
  const session = useSession();
  const { capacityPools, bootstrapQuota } = useAdmin();
  const owner = isOwnerSession(session);
  const permissions = session?.permissions ?? [];
  const canNodes = owner || permissions.includes("nodes");
  const canSeeCapacity = canNodes || permissions.includes("customers");

  return (
    <div className="mx-auto max-w-5xl">
      <AdminPageHeader title={t("homeTitle")} subtitle={t("homeSubtitle")} />
      <OpsHealthPanel owner={owner} />
      {canSeeCapacity ? (
        <CapacityAlerts
          pools={capacityPools}
          quota={bootstrapQuota}
          allowAdd={canNodes}
          showSyncNote
        />
      ) : null}
      <div className="grid items-stretch gap-4 md:grid-cols-3">
        {ADMIN_TAB_PRODUCTS.map((service) => (
          <ProductCard key={service} service={service} />
        ))}
      </div>
    </div>
  );
}
