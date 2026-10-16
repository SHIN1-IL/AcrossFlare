"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminSteps } from "@/components/admin/admin-steps";
import { areaClass, fieldClass } from "@/components/admin/admin-drawer";
import { CopyField } from "@/components/app/copy-field";
import { KaringConnectPanel } from "@/components/app/karing-connect-panel";
import { WireGuardSnippet } from "@/components/app/wireguard-snippet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAdmin } from "@/hooks/use-admin";
import { Link } from "@/i18n/navigation";
import { adminTabMessageKey } from "@/lib/admin-nav";
import { productForAdminService, type AdminServiceId } from "@/lib/admin-service";
import { planTrafficQuota, provisionExpiryDate } from "@/lib/plans";
import { normalizeEmail } from "@/lib/session";
import { clearProvision, getCustomerById, listAllPlansForService, runProvision } from "@/lib/admin-store";
import { AdminPlanOption } from "@/components/admin/admin-plan-label";

export function ProvisionPanel({ service }: { service: AdminServiceId }) {
  const t = useTranslations("admin");
  const tApp = useTranslations("app");
  const { provision, provisioning, provisionSimulate } = useAdmin();
  const product = productForAdminService(service);
  const plans = listAllPlansForService(service);
  const [email, setEmail] = useState("");
  const [planId, setPlanId] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [expiryTouched, setExpiryTouched] = useState(false);
  const selectedPlanId = planId || plans[0]?.id || "";
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? null;
  const selectedQuota = selectedPlan ? planTrafficQuota(selectedPlan) : null;
  const expiryValue = expiryTouched ? expiresAt : selectedPlanId ? provisionExpiryDate(selectedPlanId) : "";
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
            if (!normalized || !selectedPlanId || !expiryValue) {
              setError(t("required"));
              return;
            }
            setError("");
            void (async () => {
              const result = await runProvision({
                product,
                email: normalized,
                planId: selectedPlanId,
                expiresAt: expiryValue,
                memo,
                simulateFail: provisionSimulate && simulateFail,
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
              <select
                className={fieldClass}
                value={selectedPlanId}
                onChange={(event) => setPlanId(event.target.value)}
              >
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
                value={expiryValue}
                onChange={(event) => {
                  setExpiryTouched(true);
                  setExpiresAt(event.target.value);
                }}
              />
            </div>
          </div>
          {selectedPlan ? (
            <p className="text-sm text-muted-foreground">
              {selectedPlan.trafficGb == null
                ? t("unlimited")
                : selectedQuota?.cadence === "month"
                  ? t("provisionYearTraffic", {
                      total: selectedPlan.trafficGb,
                      month: selectedQuota.gb,
                    })
                  : t("provisionTraffic", { total: selectedPlan.trafficGb })}
            </p>
          ) : null}
          <div className="space-y-2">
            <Label>{t("memo")}</Label>
            <textarea className={areaClass} value={memo} onChange={(event) => setMemo(event.target.value)} />
          </div>
          {provisionSimulate ? (
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={simulateFail} onChange={(event) => setSimulateFail(event.target.checked)} />
              {t("simulateFail")}
            </label>
          ) : null}
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
                <KaringConnectPanel yamlUrl={issued.credentials.yamlUrl}>
                  <CopyField label={tApp("vaultUrl")} value={issued.credentials.vaultUrl} />
                  <CopyField label={tApp("syncthingUrl")} value={issued.credentials.syncthingUrl} />
                  <CopyField label={tApp("syncthingFolder")} value={issued.credentials.syncthingFolderId} />
                </KaringConnectPanel>
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

