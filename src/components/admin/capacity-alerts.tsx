"use client";

import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { AdminPoolCapacity, BootstrapQuota } from "@/lib/admin";
import { BOOTSTRAP_FAILURE_ALERT_COUNT } from "@/lib/provision/capacity-expand";
import { cn } from "@/lib/utils";

function formatSlots(slots: AdminPoolCapacity["neededSlots"]) {
  return slots
    .map((slot) => `${slot.role === "failover" ? "FAILOVER" : "PRIMARY"} ×${slot.count}`)
    .join(", ");
}

function nodesPathForPool(poolId: string) {
  return poolId === "global-hybrid" ? "/admin/hybrid/nodes" : "/admin/standard/nodes";
}

export function CapacityAlerts({
  pools,
  quota,
  allowAdd,
  showSyncNote,
  onAdd,
}: {
  pools: AdminPoolCapacity[];
  quota: BootstrapQuota;
  allowAdd: boolean;
  showSyncNote?: boolean;
  onAdd?: (poolId: string, role: "primary" | "failover") => void;
}) {
  const t = useTranslations("admin");
  const fullPools = pools.filter((pool) => pool.full);
  const limitHit = quota.used >= quota.limit;
  const failureAlert = quota.recentFailures >= BOOTSTRAP_FAILURE_ALERT_COUNT;

  if (!fullPools.length && !limitHit && !failureAlert) {
    return null;
  }

  return (
    <div className="mb-6 space-y-3">
      {limitHit ? (
        <p className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          {t("bootstrapDailyLimit", { limit: quota.limit })}
        </p>
      ) : null}
      {failureAlert ? (
        <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {t("bootstrapFailureAlert", { count: quota.recentFailures })}
        </p>
      ) : null}
      {fullPools.map((pool) => {
        const role = pool.neededSlots[0]?.role ?? "primary";
        const slots = formatSlots(pool.neededSlots);
        const canOpenForm = String(pool.product).toUpperCase() === "GLOBAL";
        return (
          <article
            key={pool.id}
            className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100"
          >
            <p className="font-medium">{t("capacityFullTitle", { pool: pool.name })}</p>
            {slots ? <p className="mt-1">{t("capacityNeeded", { slots })}</p> : null}
            <p className="mt-1 text-amber-100/80">{t("capacityFullHint")}</p>
            {allowAdd && canOpenForm ? (
              <div className="mt-3">
                {onAdd ? (
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-[10px]"
                    onClick={() => onAdd(pool.id, role)}
                  >
                    {t("capacityAddNode")}
                  </Button>
                ) : (
                  <Link
                    href={{
                      pathname: nodesPathForPool(pool.id),
                      query: { bootstrap: "1", pool: pool.id, role },
                    }}
                    className={cn(buttonVariants({ size: "sm" }), "rounded-[10px]")}
                  >
                    {t("capacityAddNode")}
                  </Link>
                )}
              </div>
            ) : null}
          </article>
        );
      })}
      {showSyncNote && fullPools.length ? (
        <p className="text-xs text-muted-foreground">{t("capacitySyncNote")}</p>
      ) : null}
    </div>
  );
}
