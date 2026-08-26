"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminSteps } from "@/components/admin/admin-steps";
import { areaClass, fieldClass } from "@/components/admin/admin-drawer";
import { CopyField } from "@/components/app/copy-field";
import { QrPanel } from "@/components/app/qr-panel";
import { WireGuardSnippet } from "@/components/app/wireguard-snippet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAdmin } from "@/hooks/use-admin";
import { Link } from "@/i18n/navigation";
import { adminTabMessageKey } from "@/lib/admin-nav";
import { productForAdminService, type AdminServiceId } from "@/lib/admin-service";
import { normalizeEmail } from "@/lib/session";
import { clearProvision, getCustomerById, listAllPlansForService, runProvision } from "@/lib/admin-store";
import { AdminPlanOption } from "@/components/admin/admin-plan-label";

export function ProvisionPanel({ service }: { service: AdminServiceId }) {
  const t = useTranslations("admin");
  const tApp = useTranslations("app");
  const { provision, provisioning } = useAdmin();
  const product = productForAdminService(service);
  const plans = listAllPlansForService(service);
  const [email, setEmail] = useState("");
  const [planId, setPlanId] = useState("");
  const [expiresAt, setExpiresAt] = useState(defaultExpiry);
  const selectedPlanId = planId || plans[0]?.id || "";
  const [memo, setMemo] = useState("");
  const [simulateFail, setSimulateFail] = useState(false);
  const [error, setError] = useState("");

  const session = provision?.product === product ? provision : null;
  const issued = session?.customerId ? getCustomerById(session.customerId) : null;

  const labels = useMemo(
    () => ({
      xui: t("stepXui"),
      backup: t("stepBackup"),
      nextcloud: t("stepBackup"),
      ready: t("stepReady"),
    }),
    [t]
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <AdminPageHeader title={t("provisionTitle")} subtitle={t("provisionSubtitle")} />

      {!session ? (
        <form
          className="space-y-4 rounded-2xl border border-border bg-card p-5"
          onSubmit={(event) => {
            event.preventDefault();
            const normalized = normalizeEmail(email);
            if (!normalized || !selectedPlanId || !expiresAt) {
              setError(t("required"));
              return;
            }
            setError("");
            void (async () => {
              const result = await runProvision({
                product,
                email: normalized,
                planId: selectedPlanId,
                expiresAt,
                memo,
                simulateFail,
              });
              if (result && "error" in result && result.error === "already_active") {
                setError(t("alreadyActive"));
              }
            })();
          }}
        >
          <div className="space-y-2">
            <Label>{t("product")}</Label>
            <input className={fieldClass} value={t(adminTabMessageKey(service))} disabled />
          </div>
          <div className="space-y-2">
            <Label>{t("email")}</Label>
            <input
              className={fieldClass}
              value={email}
              placeholder="ops@example.com"
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("plan")}</Label>
              <select className={fieldClass} value={selectedPlanId} onChange={(event) => setPlanId(event.target.value)}>
                {plans.map((plan) => (
                  <AdminPlanOption key={plan.id} planId={plan.id} fallback={plan.name} />
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>{t("expiry")}</Label>
              <input
                type="date"
                className={fieldClass}
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("memo")}</Label>
            <textarea className={areaClass} value={memo} onChange={(event) => setMemo(event.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={simulateFail} onChange={(event) => setSimulateFail(event.target.checked)} />
            {t("simulateFail")}
          </label>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={provisioning || !plans.length} className="rounded-[10px]">
            {t("issue")}
          </Button>
        </form>
      ) : (
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <AdminSteps steps={session.steps} labels={labels} />
          {session.failed ? <p className="text-sm text-destructive">{t("provisionFailed")}</p> : null}
          {issued?.credentials && !session.failed ? (
            <div className="space-y-4">
              <p className="text-sm text-primary">{t("provisionDone")}</p>
              {session.loginPassword ? (
                <CopyField label={t("tempPassword")} value={session.loginPassword} />
              ) : null}
              {issued.credentials.kind === "global" ? (
                <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
                  <QrPanel value={issued.credentials.deepLink} label={tApp("karingQr")} />
                  <div className="space-y-3">
                    <CopyField label={tApp("deepLink")} value={issued.credentials.deepLink} />
                    <CopyField label={tApp("yamlUrl")} value={issued.credentials.yamlUrl} />
                    <CopyField label={tApp("vaultUrl")} value={issued.credentials.vaultUrl} />
                    <CopyField label={tApp("syncthingUrl")} value={issued.credentials.syncthingUrl} />
                    <CopyField label={tApp("syncthingFolder")} value={issued.credentials.syncthingFolderId} />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <CopyField label={tApp("http")} value={issued.credentials.httpUrl} />
                  <CopyField label={tApp("socks5")} value={issued.credentials.socksUrl} />
                  <WireGuardSnippet config={issued.credentials.wgConfig} filename="acrossflare.conf" />
                </div>
              )}
              <Link href={`/admin/${service}/customers/${issued.id}`} className="block text-sm text-primary">
                {t("open")}
              </Link>
            </div>
          ) : null}
          <Button type="button" variant="outline" className="rounded-[10px]" onClick={() => clearProvision()}>
            {session.failed || issued ? t("issueAnother") : t("cancel")}
          </Button>
        </div>
      )}
    </div>
  );
}

function defaultExpiry() {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().slice(0, 10);
}
