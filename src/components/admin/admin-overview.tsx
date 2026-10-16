"use client";

import { useTranslations } from "next-intl";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CapacityAlerts } from "@/components/admin/capacity-alerts";
import { OpsHealthPanel } from "@/components/admin/ops-health";
import { StatusPill } from "@/components/app/status-pill";
import { buttonVariants } from "@/components/ui/button";
import { useAdmin } from "@/hooks/use-admin";
import { useSession } from "@/hooks/use-account";
import { Link } from "@/i18n/navigation";
import { isOwnerSession } from "@/lib/auth-types";
import { jobsForAdminService, poolsForAdminService } from "@/lib/admin-overview";
import { listCustomersForService } from "@/lib/admin-store";
import type { AdminServiceId } from "@/lib/admin-service";
import { cn } from "@/lib/utils";

function jobTone(status: string) {
  if (status === "succeeded") {
    return "ok" as const;
  }
  if (status === "failed" || status === "running") {
    return "warn" as const;
  }
  return "neutral" as const;
}

function jobStatusKey(status: string) {
  if (status === "running") {
    return "bootstrapStatusRunning" as const;
  }
  if (status === "succeeded") {
    return "bootstrapStatusSucceeded" as const;
  }
  if (status === "failed") {
    return "bootstrapStatusFailed" as const;
  }
  return "bootstrapStatusQueued" as const;
}

function groupStatusKey(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "ready") {
    return "overviewGroupReady" as const;
  }
  if (normalized === "draining") {
    return "overviewGroupDraining" as const;
  }
  return "overviewGroupOpening" as const;
}

export function AdminOverview({ service }: { service: AdminServiceId }) {
  const t = useTranslations("admin");
  const session = useSession();
  const owner = isOwnerSession(session);
  const permissions = session?.permissions ?? [];
  const canCustomers = permissions.includes("customers");
  const canNodes = owner || permissions.includes("nodes");
  const { capacityPools, bootstrapQuota, bootstrapJobs } = useAdmin();
  const pools = poolsForAdminService(service, capacityPools ?? []);
  const jobs = canNodes ? jobsForAdminService(service, bootstrapJobs ?? []).slice(0, 12) : [];
  const failures = canCustomers
    ? listCustomersForService(service).filter((customer) => customer.status === "failed")
    : [];

  return (
    <div className="mx-auto max-w-5xl">
      <AdminPageHeader
        title={t("overviewTitle")}
        subtitle={t("overviewSubtitle")}
        action={
          <div className="flex flex-wrap gap-2">
            {canCustomers ? (
              <Link
                href={`/admin/${service}/customers`}
                className={cn(buttonVariants(), "rounded-[10px]")}
              >
                {t("navCustomers")}
              </Link>
            ) : null}
            {canNodes ? (
              <Link
                href={`/admin/${service}/nodes`}
                className={cn(buttonVariants({ variant: "outline" }), "rounded-[10px]")}
              >
                {t("capacityAddNode")}
              </Link>
            ) : null}
          </div>
        }
      />
      <OpsHealthPanel owner={owner} />
      {canCustomers || canNodes ? (
        <CapacityAlerts pools={pools} quota={bootstrapQuota} allowAdd={canNodes} showSyncNote />
      ) : null}

      <section className="mb-6 space-y-3">
        <h2 className="text-sm font-medium">{t("overviewSeats")}</h2>
        {pools.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {pools.map((pool) => (
              <article key={pool.id} className="rounded-2xl border border-border bg-card p-4 text-sm">
                <p className="font-medium">{pool.name}</p>
                <p className="mt-1 text-muted-foreground">
                  {t("capacitySeats", {
                    remaining: pool.seatsRemaining,
                    used: pool.seatsUsed,
                    max: pool.seatsMax,
                    selectable: pool.maxSelectable,
                  })}
                </p>
                {pool.groups.length ? (
                  <ul className="mt-3 space-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
                    {pool.groups.map((group) => (
                      <li key={group.id} className="flex items-center justify-between gap-3">
                        <span>{group.name}</span>
                        <span className="font-mono">
                          {t(groupStatusKey(group.status))} {group.seatsUsed}/{group.seatsMax}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted-foreground">
            {t("overviewNoPools")}
          </p>
        )}
      </section>

      {canCustomers ? (
        <section className="mb-6 space-y-3">
          <h2 className="text-sm font-medium">{t("overviewFailures")}</h2>
          {failures.length ? (
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
              {failures.map((customer) => (
                <li key={customer.id}>
                  <Link
                    href={`/admin/${service}/customers/${customer.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-surface"
                  >
                    <span>{customer.email}</span>
                    <span className="text-xs text-muted-foreground">
                      {customer.provisionError === "capacity_full"
                        ? t("capacityFullError")
                        : customer.provisionError || t("statusFailed")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted-foreground">
              {t("overviewNoFailures")}
            </p>
          )}
        </section>
      ) : null}

      {canNodes ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-medium">{t("overviewQueue")}</h2>
            <p className="font-mono text-xs text-muted-foreground">
              {t("overviewBootstrapQuota", { used: bootstrapQuota.used, limit: bootstrapQuota.limit })}
            </p>
          </div>
          {jobs.length ? (
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-border bg-surface text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">{t("nodeName")}</th>
                    <th className="px-4 py-3 font-medium">{t("ddns")}</th>
                    <th className="px-4 py-3 font-medium">{t("status")}</th>
                    <th className="px-4 py-3 font-medium">{t("overviewWhen")}</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">
                        <p>{job.name}</p>
                        {job.error ? <p className="mt-1 text-xs text-destructive">{job.error}</p> : null}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{job.ddnsHost}</td>
                      <td className="px-4 py-3">
                        <StatusPill label={t(jobStatusKey(job.status))} tone={jobTone(job.status)} />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {new Date(job.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted-foreground">
              {t("overviewQueueEmpty")}
            </p>
          )}
          <p className="text-xs text-muted-foreground">{t("overviewAdvancedHint")}</p>
        </section>
      ) : null}
    </div>
  );
}
