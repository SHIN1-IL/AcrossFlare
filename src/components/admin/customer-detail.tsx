"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminSteps } from "@/components/admin/admin-steps";
import { fieldClass } from "@/components/admin/admin-drawer";
import { CopyField } from "@/components/app/copy-field";
import { QrPanel } from "@/components/app/qr-panel";
import { StatusPill } from "@/components/app/status-pill";
import { WireGuardSnippet } from "@/components/app/wireguard-snippet";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAdmin } from "@/hooks/use-admin";
import { useSession } from "@/hooks/use-account";
import { Link } from "@/i18n/navigation";
import {
  clearPlanChange,
  getCustomerById,
  listAllPlansForService,
  listNodesForService,
  loadCustomerDetail,
  recordRotate,
  retryProvision,
  runPlanChange,
} from "@/lib/admin-store";
import { canRetryProvision, fulfillmentSteps } from "@/lib/admin-queue";
import { AdminPlanLabel, AdminPlanOption } from "@/components/admin/admin-plan-label";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format-date";
import type { AdminServiceId } from "@/lib/admin-service";
import { cn } from "@/lib/utils";

export function CustomerDetail({ service, id }: { service: AdminServiceId; id: string }) {
  const t = useTranslations("admin");
  const tApp = useTranslations("app");
  const locale = useLocale();
  const session = useSession();
  const { changing } = useAdmin();
  const customer = getCustomerById(id);
  const plans = listAllPlansForService(service);
  const nodes = listNodesForService(service);
  const [toPlanId, setToPlanId] = useState("");
  const [simulateFail, setSimulateFail] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState("");
  const canProvision = Boolean(session?.permissions?.includes("provision"));

  useEffect(() => {
    void loadCustomerDetail(id);
  }, [id]);

  if (!customer) {
    return (
      <div className="mx-auto max-w-3xl">
        <p className="text-sm text-muted-foreground">{t("notFound")}</p>
        <Link href={`/admin/${service}/customers`} className={cn(buttonVariants({ variant: "outline" }), "mt-4 rounded-[10px]")}>
          {t("back")}
        </Link>
      </div>
    );
  }

  const ddns = customer.nodeIds
    .map((nodeId) => nodes.find((node) => node.id === nodeId)?.ddns)
    .filter((value): value is string => Boolean(value));
  const otherPlans = plans.filter((plan) => plan.id !== customer.planId);
  const selectedPlan = toPlanId || otherPlans[0]?.id || "";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <AdminPageHeader
        title={customer.email}
        subtitle={t("detailTitle")}
        action={
          <Link href={`/admin/${service}/customers`} className={cn(buttonVariants({ variant: "outline" }), "rounded-[10px]")}>
            {t("back")}
          </Link>
        }
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">{t("plan")}</p>
          <div className="mt-2 text-sm">
            <AdminPlanLabel planId={customer.planId} fallback={customer.planName} />
          </div>
        </div>
        <Meta
          label={t("period")}
          value={`${formatDate(locale, customer.createdAt)} → ${formatDate(locale, customer.expiresAt)}`}
        />
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">{t("status")}</p>
          <div className="mt-2">
            <StatusPill
              label={t(
                customer.status === "active"
                  ? "statusActive"
                  : customer.status === "unpaid"
                    ? "statusUnpaid"
                    : customer.status === "provisioning"
                      ? "statusProvisioning"
                      : "statusFailed"
              )}
              tone={customer.status === "active" ? "ok" : "warn"}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">{t("step")}</p>
          {canProvision && canRetryProvision(customer) ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-[10px]"
              disabled={retrying}
              onClick={() => {
                setRetryError("");
                setRetrying(true);
                void retryProvision(customer.id).then((result) => {
                  setRetrying(false);
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
        </div>
        <AdminSteps
          steps={fulfillmentSteps(customer)}
          labels={{
            payment: t("stepPayment"),
            xui: t("stepXui"),
            backup: t("stepBackup"),
            nextcloud: t("stepBackup"),
            ready: t("stepReady"),
          }}
        />
        {customer.provisionError ? (
          <p className="font-mono text-xs text-destructive">{customer.provisionError}</p>
        ) : null}
        {retryError ? <p className="text-sm text-destructive">{retryError}</p> : null}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm">{t("nodes")}</p>
        <p className="mt-2 font-mono text-xs text-muted-foreground">{ddns.join(" · ") || "—"}</p>
        {customer.memo ? <p className="mt-3 text-sm text-muted-foreground">{customer.memo}</p> : null}
      </section>

      {customer.credentials ? (
        <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <p className="text-sm">{t("credentials")}</p>
          {customer.credentials.kind === "global" ? (
            <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
              <QrPanel value={customer.credentials.deepLink} label={tApp("karingQr")} />
              <div className="space-y-3">
                <CopyField label={tApp("deepLink")} value={customer.credentials.deepLink} />
                <CopyField label={tApp("yamlUrl")} value={customer.credentials.yamlUrl} />
                <CopyField label={tApp("vaultUrl")} value={customer.credentials.vaultUrl} />
                <CopyField label={tApp("syncthingUrl")} value={customer.credentials.syncthingUrl} />
                <CopyField label={tApp("syncthingFolder")} value={customer.credentials.syncthingFolderId} />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <CopyField label={tApp("http")} value={customer.credentials.httpUrl} />
              <CopyField label={tApp("socks5")} value={customer.credentials.socksUrl} />
              <WireGuardSnippet config={customer.credentials.wgConfig} filename="acrossflare.conf" />
            </div>
          )}
        </section>
      ) : null}

      {customer.product === "marketing" ? (
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm">{t("rotateHistory")}</p>
            {customer.status === "active" ? (
              <Button type="button" variant="outline" size="sm" className="rounded-[10px]" onClick={() => void recordRotate(customer.id)}>
                {tApp("rotate")}
              </Button>
            ) : null}
          </div>
          {customer.rotateHistory.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">{t("noRotates")}</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {customer.rotateHistory.map((event) => (
                <li key={event.id} className="flex flex-wrap justify-between gap-2 font-mono text-xs text-muted-foreground">
                  <span>{formatDateTime(locale, event.at)}</span>
                  <span>
                    {event.fromIp} → {event.toIp}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <section className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm">{t("paymentsTitle")}</p>
        {customer.payments.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("emptyPayments")}</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {customer.payments.map((payment) => (
              <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-mono text-xs text-muted-foreground">{formatDateTime(locale, payment.createdAt)}</span>
                <span>{formatMoney(locale, payment.amount, payment.currency)}</span>
                <span className="text-xs text-muted-foreground">
                  {payment.method === "alipay" ? t("payAlipay") : t("payCard")} · {payment.provider}
                </span>
                <StatusPill
                  label={t(
                    payment.status === "succeeded"
                      ? "paySucceeded"
                      : payment.status === "failed"
                        ? "payFailed"
                        : "payPending"
                  )}
                  tone={payment.status === "succeeded" ? "ok" : payment.status === "failed" ? "warn" : "neutral"}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm">{t("auditTitle")}</p>
        {customer.auditLogs.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("auditEmpty")}</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {customer.auditLogs.map((entry) => (
              <li key={entry.id} className="flex flex-wrap justify-between gap-2 text-sm">
                <span>
                  {entry.action === "provision"
                    ? t("auditProvision")
                    : entry.action === "retry"
                      ? t("auditRetry")
                      : entry.action === "plan_change"
                        ? t("auditPlanChange")
                        : entry.action === "rotate"
                          ? t("auditRotate")
                          : entry.action === "migrate"
                            ? t("auditMigrate")
                            : entry.action}
                </span>
                <span className="font-mono text-xs text-muted-foreground">{entry.actorEmail}</span>
                <span className="font-mono text-xs text-muted-foreground">{formatDateTime(locale, entry.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {customer.status === "active" && otherPlans.length ? (
        <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="text-sm">{t("changePlan")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("changePlanHint")}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="space-y-2">
              <Label>{t("plan")}</Label>
              <select
                className={fieldClass}
                value={selectedPlan}
                onChange={(event) => setToPlanId(event.target.value)}
              >
                {otherPlans.map((plan) => (
                  <AdminPlanOption key={plan.id} planId={plan.id} fallback={plan.name} />
                ))}
              </select>
            </div>
            <Button
              type="button"
              className="rounded-[10px]"
              disabled={changing || !selectedPlan}
              onClick={() => void runPlanChange({ product: customer.product, customerId: customer.id, toPlanId: selectedPlan, simulateFail })}
            >
              {t("runChange")}
            </Button>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={simulateFail} onChange={(event) => setSimulateFail(event.target.checked)} />
            {t("simulateFail")}
          </label>
          {customer.planChange ? (
            <div className="space-y-3">
              <AdminSteps
                steps={customer.planChange.steps}
                labels={{
                  destroy: t("stepDestroy"),
                  create: t("stepCreate"),
                  db: t("stepDb"),
                }}
              />
              {customer.planChange.failed ? (
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm text-destructive">{t("changeFailed")}</p>
                  <Button type="button" variant="outline" size="sm" className="rounded-[10px]" onClick={() => clearPlanChange(customer.id)}>
                    {t("retry")}
                  </Button>
                </div>
              ) : customer.planChange.steps.every((step) => step.status === "done") ? (
                <p className="text-sm text-primary">{t("changeDone")}</p>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm">{value}</p>
    </div>
  );
}