"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { AdminDrawer, fieldClass } from "@/components/admin/admin-drawer";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { StatusPill } from "@/components/app/status-pill";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAdmin } from "@/hooks/use-admin";
import type { AppLocale } from "@/i18n/routing";
import { deletePlan, listPlansForService, upsertPlan } from "@/lib/admin-store";
import { PriceAmount } from "@/components/marketing/price-amount";
import { AdminPlanLabel } from "@/components/admin/admin-plan-label";
import type { AdminPlan } from "@/lib/admin";
import { productHasBackup } from "@/lib/admin-nav";
import { productForAdminService, type AdminServiceId } from "@/lib/admin-service";
import { planCompareExtremes, planCompareRows } from "@/lib/plan-compare";
import { planTerm, planTrafficQuota } from "@/lib/plans";

type Draft = {
  id?: string;
  name: string;
  krw: string;
  usd: string;
  cny: string;
  jpy: string;
  traffic: string;
  backup: string;
  nodes: string;
  visible: boolean;
  featured: boolean;
};

function fromPlan(plan: AdminPlan): Draft {
  return {
    id: plan.id,
    name: plan.name,
    krw: String(plan.prices.krw),
    usd: String(plan.prices.usd),
    cny: String(plan.prices.cny),
    jpy: String(plan.prices.jpy),
    traffic: plan.trafficGb == null ? "" : String(plan.trafficGb),
    backup: plan.backupGb == null ? "" : String(plan.backupGb),
    nodes: plan.nodes.join(", "),
    visible: plan.visible,
    featured: Boolean(plan.featured),
  };
}

function periodLabel(planId: string, week: string, month: string, year: string) {
  const term = planTerm(planId);
  if (term === "week") return week;
  if (term === "year") return year;
  return month;
}

function trafficLabel(plan: AdminPlan, unlimited: string, month: string, total: string, panelTotal: string) {
  const quota = planTrafficQuota(plan);
  if (!quota) {
    return unlimited;
  }
  if (quota.cadence === "month") {
    return `${month} ${quota.gb}GB · ${panelTotal}`;
  }
  return `${total} ${quota.gb}GB`;
}

export function PlanManager({ service }: { service: AdminServiceId }) {
  const t = useTranslations("admin");
  const tPricing = useTranslations("pricing");
  const locale = useLocale() as AppLocale;
  useAdmin();
  const product = productForAdminService(service);
  const { catalog } = listPlansForService(service);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const showBackup = productHasBackup(product);
  const week = tPricing("periodWeek");
  const month = tPricing("periodMonth");
  const year = tPricing("periodYear");
  const draftPeriod = draft?.id ? periodLabel(draft.id, week, month, year) : month;

  function renderTable(plans: AdminPlan[], title: string) {
    if (!plans.length) {
      return null;
    }

    return (
      <div className="space-y-2">
        <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">{title}</p>
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border bg-surface text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">{t("name")}</th>
                <th className="px-4 py-3 font-medium">{t("priceKrw")}</th>
                <th className="px-4 py-3 font-medium">{t("traffic")}</th>
                {showBackup ? <th className="px-4 py-3 font-medium">{t("backup")}</th> : null}
                <th className="px-4 py-3 font-medium">{t("nodes")}</th>
                <th className="px-4 py-3 font-medium">{t("visible")}</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <AdminPlanLabel planId={plan.id} fallback={plan.name} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    <PriceAmount locale={locale} prices={plan.prices} />
                    <span className="ml-1 text-muted-foreground">{periodLabel(plan.id, week, month, year)}</span>
                    <span className="mt-1 block text-muted-foreground">
                      ${plan.prices.usd} · CN¥{plan.prices.cny} · ¥{plan.prices.jpy}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {trafficLabel(
                      plan,
                      t("unlimited"),
                      tPricing("quotaMonth"),
                      tPricing("quotaTotal"),
                      t("planPanelTotal", { total: plan.trafficGb ?? 0 })
                    )}
                  </td>
                  {showBackup ? (
                    <td className="px-4 py-3 font-mono text-xs">
                      {plan.backupGb == null ? "—" : `${plan.backupGb} GB`}
                    </td>
                  ) : null}
                  <td className="px-4 py-3 font-mono text-xs">{plan.nodes.join(" · ")}</td>
                  <td className="px-4 py-3">
                    <StatusPill
                      label={plan.visible ? t("visible") : t("hidden")}
                      tone={plan.visible ? "ok" : "neutral"}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setDraft(fromPlan(plan))}>
                      {t("edit")}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <AdminPageHeader title={t("plansTitle")} subtitle={t("plansSubtitle")} />

      {renderTable(catalog, t("catalogPlans"))}
      <PlanCompare plans={catalog} />

      <AdminDrawer
        open={Boolean(draft)}
        title={draft?.id ? t("edit") : t("newPlan")}
        onClose={() => {
          setDraft(null);
          setError("");
        }}
      >
        {draft ? (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!draft.name.trim() || !draft.krw || !draft.usd || !draft.cny) {
                setError(t("required"));
                return;
              }

              void (async () => {
                const result = await upsertPlan({
                  id: draft.id,
                  product,
                  name: draft.name.trim(),
                  prices: {
                    krw: Number(draft.krw) || 0,
                    usd: Number(draft.usd) || 0,
                    cny: Number(draft.cny) || 0,
                    jpy: Number(draft.jpy) || 0,
                  },
                  trafficGb: draft.traffic === "" ? null : Number(draft.traffic) || 0,
                  backupGb: showBackup
                    ? draft.backup === ""
                      ? null
                      : Number(draft.backup) || 0
                    : null,
                  nodes: draft.nodes
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
                  visible: draft.visible,
                  featured: draft.featured,
                });
                if (!result.ok) {
                  setError(result.error === "plan_in_use" ? t("planInUse") : t("required"));
                  return;
                }
                setDraft(null);
                setError("");
              })();
            }}
          >
            <Field label={t("name")}>
              <input
                className={fieldClass}
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={`${t("priceKrw")} ${draftPeriod}`}>
                <input
                  className={fieldClass}
                  inputMode="numeric"
                  value={draft.krw}
                  onChange={(event) => setDraft({ ...draft, krw: event.target.value })}
                />
              </Field>
              <Field label={`${t("priceUsd")} ${draftPeriod}`}>
                <input
                  className={fieldClass}
                  inputMode="numeric"
                  value={draft.usd}
                  onChange={(event) => setDraft({ ...draft, usd: event.target.value })}
                />
              </Field>
              <Field label={`${t("priceCny")} ${draftPeriod}`}>
                <input
                  className={fieldClass}
                  inputMode="numeric"
                  value={draft.cny}
                  onChange={(event) => setDraft({ ...draft, cny: event.target.value })}
                />
              </Field>
              <Field label={`${t("priceJpy")} ${draftPeriod}`}>
                <input
                  className={fieldClass}
                  inputMode="numeric"
                  value={draft.jpy}
                  onChange={(event) => setDraft({ ...draft, jpy: event.target.value })}
                />
              </Field>
            </div>
            <Field label={t("traffic")}>
              <input
                className={fieldClass}
                inputMode="numeric"
                placeholder={t("trafficHint")}
                value={draft.traffic}
                onChange={(event) => setDraft({ ...draft, traffic: event.target.value })}
              />
            </Field>
            {showBackup ? (
              <Field label={t("backup")}>
                <input
                  className={fieldClass}
                  inputMode="numeric"
                  value={draft.backup}
                  onChange={(event) => setDraft({ ...draft, backup: event.target.value })}
                />
              </Field>
            ) : null}
            <Field label={t("nodes")}>
              <input
                className={fieldClass}
                placeholder={t("nodesHint")}
                value={draft.nodes}
                onChange={(event) => setDraft({ ...draft, nodes: event.target.value })}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.visible}
                onChange={(event) => setDraft({ ...draft, visible: event.target.checked })}
              />
              {t("visible")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.featured}
                onChange={(event) => setDraft({ ...draft, featured: event.target.checked })}
              />
              {t("featured")}
            </label>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex gap-2 pt-2">
              <Button type="submit" className="rounded-[10px]">
                {t("save")}
              </Button>
              {draft.id ? (
                <Button
                  type="button"
                  variant="destructive"
                  className="rounded-[10px]"
                  onClick={() => {
                    void (async () => {
                      if (!(await deletePlan(draft.id ?? ""))) {
                        setError(t("planInUse"));
                        return;
                      }
                      setDraft(null);
                    })();
                  }}
                >
                  {t("delete")}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                className="rounded-[10px]"
                onClick={() => {
                  setDraft(null);
                  setError("");
                }}
              >
                {t("cancel")}
              </Button>
            </div>
          </form>
        ) : null}
      </AdminDrawer>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function PlanCompare({ plans }: { plans: AdminPlan[] }) {
  const t = useTranslations("admin");
  const tPricing = useTranslations("pricing");
  const week = tPricing("periodWeek");
  const month = tPricing("periodMonth");
  const year = tPricing("periodYear");
  if (plans.length < 2) {
    return null;
  }

  const rows = planCompareRows(plans);
  const extremes = planCompareExtremes(rows);
  const maxTraffic = Math.max(...rows.map((row) => row.trafficGb ?? 0), 1);
  const labelFor = (id: string) => periodLabel(id, week, month, year);

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <h2 className="text-sm font-medium">{t("compareTitle")}</h2>
      <ul className="space-y-3">
        {rows.map((row) => {
          const width = row.trafficGb == null ? 100 : Math.max(8, Math.round((row.trafficGb / maxTraffic) * 100));
          const traffic =
            row.trafficGb == null
              ? t("compareUnlimited")
              : row.monthlyGb != null
                ? `${tPricing("quotaMonth")} ${row.monthlyGb}GB · ${t("planPanelTotal", { total: row.trafficGb })}`
                : `${row.trafficGb}GB`;
          return (
            <li key={row.id}>
              <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2 text-xs">
                <span>{labelFor(row.id)}</span>
                <span className="font-mono text-muted-foreground">
                  {t("compareDays", { days: row.days })} · {traffic}
                  {row.krwPerGb != null ? ` · ${t("comparePerGb", { price: row.krwPerGb })}` : ""}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface">
                <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
      <div className="space-y-1 text-sm text-muted-foreground">
        {rows
          .filter((row) => row.monthlyGb != null && row.trafficGb != null)
          .map((row) => (
            <p key={row.id}>
              {t("compareYearNote", { name: labelFor(row.id), month: row.monthlyGb ?? 0, total: row.trafficGb ?? 0 })}
            </p>
          ))}
        {extremes.cheapestId && extremes.dearestId && extremes.cheapestId !== extremes.dearestId ? (
          <>
            <p>{t("compareCheapest", { name: labelFor(extremes.cheapestId) })}</p>
            <p>{t("compareDearest", { name: labelFor(extremes.dearestId) })}</p>
          </>
        ) : null}
      </div>
    </section>
  );
}
