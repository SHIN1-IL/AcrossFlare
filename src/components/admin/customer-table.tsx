"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPlanLabel } from "@/components/admin/admin-plan-label";
import { StatusPill } from "@/components/app/status-pill";
import { PriceAmount } from "@/components/marketing/price-amount";
import { Button, buttonVariants } from "@/components/ui/button";
import { fieldClass } from "@/components/admin/admin-drawer";
import { useAdmin } from "@/hooks/use-admin";
import { useSession } from "@/hooks/use-account";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { getLivePlan, listCustomersForService, listNodesForService, retryProvision } from "@/lib/admin-store";
import type { CustomerStatus } from "@/lib/admin";
import type { AdminServiceId } from "@/lib/admin-service";
import {
  ADMIN_QUEUE_FILTERS,
  adminQueueCounts,
  canRetryProvision,
  currentFulfillmentStep,
  matchesAdminQueueFilter,
  paginateItems,
  parseAdminQueueFilter,
  sortAdminQueue,
  stepTone,
  type AdminQueueFilter,
} from "@/lib/admin-queue";
import { formatDate } from "@/lib/format-date";
import { cn } from "@/lib/utils";

function toneFor(status: CustomerStatus) {
  if (status === "active") {
    return "ok" as const;
  }
  if (status === "failed" || status === "unpaid") {
    return "warn" as const;
  }
  return "neutral" as const;
}

const FILTER_LABEL: Record<AdminQueueFilter, "filterAll" | "filterFailed" | "filterProvisioning" | "filterUnpaid" | "filterExpiring"> =
  {
    all: "filterAll",
    failed: "filterFailed",
    provisioning: "filterProvisioning",
    unpaid: "filterUnpaid",
    expiring: "filterExpiring",
  };

export function CustomerTable({
  service,
  status,
}: {
  service: AdminServiceId;
  status?: string;
}) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const session = useSession();
  useAdmin();
  const customers = listCustomersForService(service);
  const nodes = listNodesForService(service);
  const canProvision = Boolean(session?.permissions?.includes("provision"));
  const filter = parseAdminQueueFilter(status);
  const counts = adminQueueCounts(customers);
  const [query, setQuery] = useState("");
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [retryError, setRetryError] = useState("");
  const [page, setPage] = useState(1);

  const stepLabels: Record<string, string> = {
    payment: t("stepPayment"),
    xui: t("stepXui"),
    backup: t("stepBackup"),
    nextcloud: t("stepBackup"),
    ready: t("stepReady"),
  };

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sortAdminQueue(customers).filter((customer) => {
      if (needle && !customer.email.toLowerCase().includes(needle)) {
        return false;
      }
      return matchesAdminQueueFilter(customer, filter);
    });
  }, [customers, filter, query]);

  const paged = paginateItems(filtered, page);

  useEffect(() => {
    setPage(1);
  }, [filter, query]);

  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        title={t("customersTitle")}
        subtitle={t("customersSubtitle")}
        action={
          canProvision ? (
            <Link href={`/admin/${service}/provision`} className={cn(buttonVariants(), "rounded-[10px]")}>
              {t("issue")}
            </Link>
          ) : undefined
        }
      />

      {customers.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card px-4 py-8 text-sm text-muted-foreground">
          {t("emptyCustomers")}
        </p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-1 rounded-[10px] bg-surface-2 p-1">
              {ADMIN_QUEUE_FILTERS.map((item) => {
                const count = item === "all" ? customers.length : counts[item];
                const href =
                  item === "all"
                    ? `/admin/${service}/customers`
                    : { pathname: `/admin/${service}/customers` as const, query: { status: item } };
                return (
                  <Link
                    key={item}
                    href={href}
                    aria-current={filter === item ? "page" : undefined}
                    className={cn(
                      "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                      filter === item
                        ? "bg-background text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t(FILTER_LABEL[item])}
                    <span className="ml-1 font-mono text-[11px] text-muted-foreground">{count}</span>
                  </Link>
                );
              })}
            </div>
            <input
              className={cn(fieldClass, "h-9 max-w-xs")}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("searchCustomers")}
              aria-label={t("searchCustomers")}
            />
          </div>

          {filtered.length === 0 ? (
            <p className="rounded-2xl border border-border bg-card px-4 py-8 text-sm text-muted-foreground">
              {t("emptyFiltered")}
            </p>
          ) : (
            <div className="max-h-[min(70vh,720px)] overflow-auto rounded-2xl border border-border">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="sticky top-0 z-10 border-b border-border bg-surface text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">
                      {t("email")}
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      {t("plan")}
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      {t("period")}
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      {t("status")}
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      {t("step")}
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      {t("memo")}
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {paged.items.map((customer) => {
                    const ddns = customer.nodeIds
                      .map((id) => nodes.find((node) => node.id === id)?.ddns)
                      .filter(Boolean);
                    const plan = getLivePlan(customer.planId);
                    const step = currentFulfillmentStep(customer);
                    const retrying = retryingId === customer.id;

                    return (
                      <tr key={customer.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 font-mono text-xs">{customer.email}</td>
                        <td className="px-4 py-3">
                          <AdminPlanLabel planId={customer.planId} fallback={customer.planName} />
                          {plan ? (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              <PriceAmount locale={locale as AppLocale} prices={plan.prices} compact className="text-xs" />
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {formatDate(locale, customer.createdAt)}
                          <span className="text-muted-foreground"> → </span>
                          {formatDate(locale, customer.expiresAt)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill
                            label={t(
                              customer.status === "active"
                                ? "statusActive"
                                : customer.status === "provisioning"
                                  ? "statusProvisioning"
                                  : customer.status === "unpaid"
                                    ? "statusUnpaid"
                                    : "statusFailed"
                            )}
                            tone={toneFor(customer.status)}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill label={stepLabels[step.id] ?? step.id} tone={stepTone(step.status)} />
                          {customer.provisionError ? (
                            <p className="mt-1 max-w-[180px] truncate font-mono text-[11px] text-destructive" title={customer.provisionError}>
                              {customer.provisionError}
                            </p>
                          ) : ddns.length ? (
                            <p className="mt-1 max-w-[180px] truncate font-mono text-[11px] text-muted-foreground">
                              {ddns.join(" · ")}
                            </p>
                          ) : null}
                        </td>
                        <td className="max-w-[160px] truncate px-4 py-3 text-muted-foreground">{customer.memo || "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            {canProvision && canRetryProvision(customer) ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="rounded-[10px]"
                                disabled={retrying}
                                onClick={() => {
                                  setRetryError("");
                                  setRetryingId(customer.id);
                                  void retryProvision(customer.id).then((result) => {
                                    setRetryingId(null);
                                    if (!result.ok) {
                                      setRetryError(
                                        result.error === "unpaid"
                                          ? t("retryUnpaid")
                                          : result.error === "already_active"
                                            ? t("alreadyActive")
                                            : t("retryFailed")
                                      );
                                    }
                                  });
                                }}
                              >
                                {t("retry")}
                              </Button>
                            ) : null}
                            <Link
                              href={`/admin/${service}/customers/${customer.id}`}
                              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "rounded-[10px]")}
                            >
                              {t("open")}
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {paged.pageCount > 1 ? (
            <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
              <p>
                {t("pageStatus", { page: paged.page, pageCount: paged.pageCount, total: paged.total })}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-[10px]"
                  disabled={paged.page <= 1}
                  onClick={() => setPage((value) => value - 1)}
                >
                  {t("pagePrev")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-[10px]"
                  disabled={paged.page >= paged.pageCount}
                  onClick={() => setPage((value) => value + 1)}
                >
                  {t("pageNext")}
                </Button>
              </div>
            </div>
          ) : null}
          {retryError ? <p className="text-sm text-destructive">{retryError}</p> : null}
        </div>
      )}
    </div>
  );
}
