"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { AdminDrawer, fieldClass } from "@/components/admin/admin-drawer";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { StatusPill } from "@/components/app/status-pill";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAdmin } from "@/hooks/use-admin";
import { AdminPlanLabel, AdminPlanOption } from "@/components/admin/admin-plan-label";
import { listPlansForService, createPromoCode, deletePromoCode, listPromoCodes } from "@/lib/admin-store";
import { getPlansByProduct } from "@/lib/plans";

export function PromoCodeManager() {
  const t = useTranslations("admin");
  useAdmin();
  const { catalog: liveCatalog } = listPlansForService("workspace");
  const catalog = getPlansByProduct("workspace");
  const planOptions = liveCatalog.length ? liveCatalog : catalog;
  const codes = listPromoCodes();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState({
    planId: planOptions[0]?.id ?? "workspace-a",
    code: "",
    note: "",
  });

  const planNames = useMemo(
    () => Object.fromEntries(planOptions.map((plan) => [plan.id, plan.name])),
    [planOptions]
  );

  function close() {
    setOpen(false);
    setError("");
    setDraft({
      planId: planOptions[0]?.id ?? "workspace-a",
      code: "",
      note: "",
    });
  }

  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        title={t("codesTitle")}
        subtitle={t("codesSubtitle")}
        action={
          <Button
            type="button"
            className="rounded-[10px]"
            onClick={() => {
              setError("");
              setDraft({
                planId: planOptions[0]?.id ?? "workspace-a",
                code: "",
                note: "",
              });
              setOpen(true);
            }}
          >
            {t("newCode")}
          </Button>
        }
      />

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border bg-surface text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">{t("codeValue")}</th>
              <th className="px-4 py-3 font-medium">{t("plan")}</th>
              <th className="px-4 py-3 font-medium">{t("memo")}</th>
              <th className="px-4 py-3 font-medium">{t("status")}</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {codes.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {t("emptyCodes")}
                </td>
              </tr>
            ) : (
              codes.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-mono text-xs tracking-wide">{row.code}</td>
                  <td className="px-4 py-3">
                    <AdminPlanLabel planId={row.planId} fallback={planNames[row.planId] ?? row.planName} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{row.note || "—"}</td>
                  <td className="px-4 py-3">
                    <StatusPill
                      label={
                        row.status === "redeemed"
                          ? t("statusRedeemed")
                          : row.reserved
                            ? t("statusReserved")
                            : t("statusUnused")
                      }
                      tone={row.status === "redeemed" || row.reserved ? "neutral" : "ok"}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.status === "unused" && !row.reserved ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="rounded-[10px]"
                        onClick={() => {
                          void deletePromoCode(row.id);
                        }}
                      >
                        {t("delete")}
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AdminDrawer open={open} title={t("newCode")} onClose={close}>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void (async () => {
              const result = await createPromoCode({
                planId: draft.planId,
                code: draft.code.trim() || undefined,
                note: draft.note.trim() || undefined,
              });
              if (!result.ok) {
                setError(
                  result.error === "code_taken"
                    ? t("codeTaken")
                    : result.error === "invalid_plan"
                      ? t("required")
                      : t("required")
                );
                return;
              }
              close();
            })();
          }}
        >
          <div className="space-y-2">
            <Label>{t("plan")}</Label>
            <select
              className={fieldClass}
              value={draft.planId}
              onChange={(event) => setDraft({ ...draft, planId: event.target.value })}
            >
              {planOptions.map((plan) => (
                <AdminPlanOption key={plan.id} planId={plan.id} fallback={plan.name} />
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>{t("codeValue")}</Label>
            <input
              className={`${fieldClass} font-mono uppercase`}
              placeholder={t("codeHint")}
              value={draft.code}
              onChange={(event) => setDraft({ ...draft, code: event.target.value })}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("memo")}</Label>
            <input
              className={fieldClass}
              value={draft.note}
              onChange={(event) => setDraft({ ...draft, note: event.target.value })}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex gap-2 pt-2">
            <Button type="submit" className="rounded-[10px]">
              {t("save")}
            </Button>
            <Button type="button" variant="outline" className="rounded-[10px]" onClick={close}>
              {t("cancel")}
            </Button>
          </div>
        </form>
      </AdminDrawer>
    </div>
  );
}
