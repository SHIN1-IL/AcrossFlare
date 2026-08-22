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
import { deletePlan, listPlans, upsertPlan } from "@/lib/admin-store";
import { formatPrimaryPrice } from "@/lib/format-price";
import type { AdminPlan } from "@/lib/admin";
import type { ProductId } from "@/lib/plans";

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

function emptyDraft(): Draft {
  return {
    name: "",
    krw: "",
    usd: "",
    cny: "",
    jpy: "",
    traffic: "",
    backup: "",
    nodes: "",
    visible: true,
    featured: false,
  };
}

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

export function PlanManager({ product }: { product: ProductId }) {
  const t = useTranslations("admin");
  const tPricing = useTranslations("pricing");
  const locale = useLocale() as AppLocale;
  useAdmin();
  const plans = listPlans(product);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");

  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        title={t("plansTitle")}
        subtitle={t("plansSubtitle")}
        action={
          <Button type="button" className="rounded-[10px]" onClick={() => setDraft(emptyDraft())}>
            {t("newPlan")}
          </Button>
        }
      />

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border bg-surface text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">{t("name")}</th>
              <th className="px-4 py-3 font-medium">{tPricing("perMonth")}</th>
              <th className="px-4 py-3 font-medium">{t("traffic")}</th>
              {product === "global" ? <th className="px-4 py-3 font-medium">{t("backup")}</th> : null}
              <th className="px-4 py-3 font-medium">{t("nodes")}</th>
              <th className="px-4 py-3 font-medium">{t("visible")}</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => (
              <tr key={plan.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">{plan.name}</td>
                <td className="px-4 py-3 font-mono text-xs">
                  {formatPrimaryPrice(locale, plan.prices)}
                  <span className="mt-1 block text-muted-foreground">
                    ${plan.prices.usd} · ¥{plan.prices.cny}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  {plan.trafficGb == null ? t("unlimited") : `${plan.trafficGb} GB`}
                </td>
                {product === "global" ? (
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
                  backupGb: product === "global" ? (draft.backup === "" ? null : Number(draft.backup) || 0) : null,
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
              <Field label={t("priceKrw")}>
                <input
                  className={fieldClass}
                  inputMode="numeric"
                  value={draft.krw}
                  onChange={(event) => setDraft({ ...draft, krw: event.target.value })}
                />
              </Field>
              <Field label={t("priceUsd")}>
                <input
                  className={fieldClass}
                  inputMode="numeric"
                  value={draft.usd}
                  onChange={(event) => setDraft({ ...draft, usd: event.target.value })}
                />
              </Field>
              <Field label={t("priceCny")}>
                <input
                  className={fieldClass}
                  inputMode="numeric"
                  value={draft.cny}
                  onChange={(event) => setDraft({ ...draft, cny: event.target.value })}
                />
              </Field>
              <Field label={t("priceJpy")}>
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
            {product === "global" ? (
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
