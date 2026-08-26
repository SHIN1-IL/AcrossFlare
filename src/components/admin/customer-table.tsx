"use client";

import { useLocale, useTranslations } from "next-intl";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { StatusPill } from "@/components/app/status-pill";
import { buttonVariants } from "@/components/ui/button";
import { useAdmin } from "@/hooks/use-admin";
import { useSession } from "@/hooks/use-account";
import { Link } from "@/i18n/navigation";
import { listCustomers, listNodes } from "@/lib/admin-store";
import type { CustomerStatus } from "@/lib/admin";
import { formatDate } from "@/lib/format-date";
import type { ProductId } from "@/lib/plans";
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

export function CustomerTable({ product }: { product: ProductId }) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const session = useSession();
  useAdmin();
  const customers = listCustomers(product);
  const nodes = listNodes(product);
  const canProvision = Boolean(session?.permissions?.includes("provision"));

  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        title={t("customersTitle")}
        subtitle={t("customersSubtitle")}
        action={
          canProvision ? (
            <Link href={`/admin/${product}/provision`} className={cn(buttonVariants(), "rounded-[10px]")}>
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
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-border bg-surface text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">{t("email")}</th>
                <th className="px-4 py-3 font-medium">{t("plan")}</th>
                <th className="px-4 py-3 font-medium">{t("expires")}</th>
                <th className="px-4 py-3 font-medium">{t("status")}</th>
                <th className="px-4 py-3 font-medium">{t("nodes")}</th>
                <th className="px-4 py-3 font-medium">{t("memo")}</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => {
                const ddns = customer.nodeIds
                  .map((id) => nodes.find((node) => node.id === id)?.ddns)
                  .filter(Boolean);

                return (
                  <tr key={customer.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-mono text-xs">{customer.email}</td>
                    <td className="px-4 py-3">{customer.planName}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatDate(locale, customer.expiresAt)}</td>
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
                    <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                      {ddns.length ? ddns.join(" · ") : "—"}
                    </td>
                    <td className="max-w-[180px] truncate px-4 py-3 text-muted-foreground">{customer.memo || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/${product}/customers/${customer.id}`}
                        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "rounded-[10px]")}
                      >
                        {t("open")}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
