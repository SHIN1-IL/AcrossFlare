"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { AdminDrawer, fieldClass } from "@/components/admin/admin-drawer";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format-date";
import {
  currentMonthKey,
  parseKrwAmount,
  shiftMonth,
  type MarginAdjustmentInput,
  type MarginSnapshot,
} from "@/lib/margin";
import { cn } from "@/lib/utils";

const cache = new Map<string, MarginSnapshot>();
const listeners = new Set<() => void>();

function publish(month: string, snapshot: MarginSnapshot) {
  cache.set(month, snapshot);
  for (const listener of listeners) {
    listener();
  }
}

async function refreshMargin(month: string) {
  const response = await fetch(`/api/v1/admin/margin?month=${encodeURIComponent(month)}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) {
    return false;
  }
  publish(month, (await response.json()) as MarginSnapshot);
  return true;
}

function useMarginSnapshot(month: string) {
  const subscribe = useCallback((listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, []);
  const getSnapshot = useCallback(() => cache.get(month) ?? null, [month]);
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}

function formatMonthLabel(locale: string, month: string) {
  const [year, mon] = month.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, mon - 1, 1)));
}

function marginTone(amount: number) {
  if (amount > 0) {
    return "text-primary";
  }
  if (amount < 0) {
    return "text-destructive";
  }
  return "text-foreground";
}

function MarginFigure({ label, amount, emphasize }: { label: string; amount: string; emphasize?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("font-mono tabular-nums", emphasize && "font-medium")}>{amount}</dd>
    </div>
  );
}

export function MarginCard() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const liveMonth = currentMonthKey();
  const snapshot = useMarginSnapshot(liveMonth);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const money = (amount: number) => formatMoney(locale, amount, "KRW");

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void refreshMargin(liveMonth).then((ok) => {
        if (!cancelled) {
          setFailed(!ok && !cache.has(liveMonth));
        }
      });
    };
    load();
    const timer = window.setInterval(load, 60_000);
    window.addEventListener("focus", load);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", load);
    };
  }, [liveMonth]);

  return (
    <>
      <section className="rounded-xl border border-border bg-card px-2.5 py-2 text-[11px]">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="font-medium text-foreground">{t("marginTitle")}</p>
          <button type="button" className="text-primary" onClick={() => setOpen(true)}>
            {t("marginEdit")}
          </button>
        </div>
        <p className="mb-1 font-mono text-[10px] text-muted-foreground">{formatMonthLabel(locale, liveMonth)}</p>
        {failed && !snapshot ? (
          <p className="text-destructive">{t("marginError")}</p>
        ) : (
          <dl className="space-y-1">
            <MarginFigure label={t("marginOperating")} amount={snapshot ? money(snapshot.operatingCostKrw) : "—"} />
            <MarginFigure label={t("marginCustomer")} amount={snapshot ? money(snapshot.revenueKrw) : "—"} />
            <div className={cn("flex items-baseline justify-between gap-2", snapshot && marginTone(snapshot.marginKrw))}>
              <dt>{t("marginActual")}</dt>
              <dd className="font-mono font-medium tabular-nums">{snapshot ? money(snapshot.marginKrw) : "—"}</dd>
            </div>
          </dl>
        )}
      </section>
      <AdminDrawer open={open} title={t("marginDrawer")} onClose={() => setOpen(false)}>
        {open ? <MarginEditor locale={locale} onSaved={() => void refreshMargin(liveMonth)} /> : null}
      </AdminDrawer>
    </>
  );
}

function MarginEditor({ locale, onSaved }: { locale: string; onSaved: () => void }) {
  const t = useTranslations("admin");
  const [month, setMonth] = useState(() => currentMonthKey());
  const snapshot = useMarginSnapshot(month);
  const [failed, setFailed] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ label: "", amount: "", note: "", recurring: false });
  const [addDraft, setAddDraft] = useState({ label: "", amount: "", note: "", recurring: false });
  const money = (amount: number) => formatMoney(locale, amount, "KRW");
  const atCurrent = month >= currentMonthKey();

  useEffect(() => {
    setDirty(false);
    setEditingId(null);
    setFormError("");
  }, [month]);

  useEffect(() => {
    let cancelled = false;
    void refreshMargin(month).then((ok) => {
      if (!cancelled) {
        setFailed(!ok && !cache.has(month));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [month]);

  useEffect(() => {
    if (!snapshot || dirty) {
      return;
    }
    setDrafts(Object.fromEntries(snapshot.nodes.map((node) => [node.id, String(node.monthlyCostKrw)])));
  }, [dirty, snapshot]);

  const draftCostsValid = snapshot?.nodes.every((node) => parseKrwAmount(drafts[node.id] ?? "", true) != null) ?? false;
  const previewOperating =
    snapshot?.nodes.reduce((sum, node) => sum + (parseKrwAmount(drafts[node.id] ?? "", true) ?? node.monthlyCostKrw), 0) ??
    0;
  const previewMargin = (snapshot?.revenueKrw ?? 0) - previewOperating;

  async function saveCosts() {
    if (!snapshot || !draftCostsValid) {
      return;
    }
    setBusy(true);
    setFormError("");
    const response = await fetch("/api/v1/admin/margin/costs", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nodes: snapshot.nodes.map((node) => ({
          id: node.id,
          monthlyCostKrw: parseKrwAmount(drafts[node.id] ?? "", true),
        })),
      }),
    });
    setBusy(false);
    if (!response.ok) {
      setFormError(t("marginSaveFailed"));
      return;
    }
    setDirty(false);
    await refreshMargin(month);
    onSaved();
  }

  async function submitAdjustment(
    input: { label: string; amount: string; note: string; recurring: boolean },
    id?: string
  ) {
    const amountKrw = parseKrwAmount(input.amount, false);
    if (!input.label.trim() || amountKrw == null) {
      setFormError(t("marginRequired"));
      return;
    }
    setBusy(true);
    setFormError("");
    const response = await fetch(id ? `/api/v1/admin/margin/adjustments/${id}` : "/api/v1/admin/margin/adjustments", {
      method: id ? "PATCH" : "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: input.label,
        amountKrw,
        note: input.note,
        recurring: input.recurring,
        month: id ? snapshot?.adjustments.find((entry) => entry.id === id)?.month ?? month : month,
      }),
    });
    setBusy(false);
    if (!response.ok) {
      setFormError(t("marginSaveFailed"));
      return;
    }
    setEditingId(null);
    setAddDraft({ label: "", amount: "", note: "", recurring: false });
    await refreshMargin(month);
    onSaved();
  }

  async function removeAdjustment(entry: MarginAdjustmentInput) {
    if (!window.confirm(t("marginDeleteConfirm", { label: entry.label }))) {
      return;
    }
    setBusy(true);
    setFormError("");
    const response = await fetch(`/api/v1/admin/margin/adjustments/${entry.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    setBusy(false);
    if (!response.ok) {
      setFormError(t("marginSaveFailed"));
      return;
    }
    await refreshMargin(month);
    onSaved();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setMonth((value) => shiftMonth(value, -1))}>
          {t("marginPrev")}
        </Button>
        <p className="font-mono text-sm">{formatMonthLabel(locale, month)}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={atCurrent}
          onClick={() => setMonth((value) => shiftMonth(value, 1))}
        >
          {t("marginNext")}
        </Button>
      </div>

      {failed && !snapshot ? <p className="text-sm text-destructive">{t("marginError")}</p> : null}
      {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

      {snapshot ? (
        <div className={cn("rounded-2xl border border-border bg-card p-4 text-sm", marginTone(previewMargin))}>
          <p className="text-xs text-muted-foreground">{t("marginFormula")}</p>
          <p className="mt-2 font-mono text-lg tabular-nums">{money(previewMargin)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {money(snapshot.revenueKrw)} − {money(previewOperating)}
          </p>
        </div>
      ) : null}

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-medium">{t("marginVps")}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{t("marginOperatingHint")}</p>
        </div>
        {snapshot && snapshot.nodes.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("marginEmptyNodes")}</p>
        ) : (
          <ul className="space-y-2">
            {snapshot?.nodes.map((node) => (
              <li key={node.id} className="grid grid-cols-[minmax(0,1fr)_7.5rem] items-center gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm">{node.name}</p>
                  {node.provider ? <p className="truncate text-xs text-muted-foreground">{node.provider}</p> : null}
                </div>
                <input
                  inputMode="numeric"
                  className={fieldClass}
                  aria-label={`${node.name} ${t("marginAmount")}`}
                  value={drafts[node.id] ?? ""}
                  onChange={(event) => {
                    setDirty(true);
                    setDrafts((current) => ({ ...current, [node.id]: event.target.value }));
                  }}
                />
              </li>
            ))}
          </ul>
        )}
        {snapshot && snapshot.nodes.some((node) => node.monthlyCostKrw === 0) ? (
          <p className="text-xs text-muted-foreground">{t("marginMissingCosts")}</p>
        ) : null}
        <Button type="button" size="sm" disabled={busy || !snapshot?.nodes.length || !draftCostsValid} onClick={() => void saveCosts()}>
          {t("marginSave")}
        </Button>
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-medium">{t("marginCustomer")}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{t("marginCustomerHint")}</p>
        </div>
        <p className="font-mono text-sm tabular-nums">
          {t("marginAuto")} {snapshot ? money(snapshot.customerPaidKrw) : "—"}
          {snapshot ? <span className="ml-2 text-xs text-muted-foreground">{t("marginPayments", { count: snapshot.paymentCount })}</span> : null}
        </p>
        {snapshot && snapshot.unconvertedCount > 0 ? (
          <p className="text-xs text-muted-foreground">{t("marginUnconverted", { count: snapshot.unconvertedCount })}</p>
        ) : null}

        <div className="space-y-2 border-t border-border pt-3">
          <h3 className="text-sm font-medium">{t("marginExtras")}</h3>
          <p className="text-xs text-muted-foreground">{t("marginAdjustHint")}</p>
          {snapshot && snapshot.adjustments.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("marginEmptyExtras")}</p>
          ) : (
            <ul className="space-y-2">
              {snapshot?.adjustments.map((entry) =>
                editingId === entry.id ? (
                  <li key={entry.id}>
                    <AdjustmentFields
                      draft={editDraft}
                      onChange={setEditDraft}
                      onSubmit={() => void submitAdjustment(editDraft, entry.id)}
                      busy={busy}
                      submitLabel={t("marginSave")}
                    />
                  </li>
                ) : (
                  <li key={entry.id} className="flex items-start justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate">
                        {entry.label}
                        {entry.recurring ? (
                          <span className="ml-2 text-[10px] tracking-wide text-primary uppercase">{t("marginRecurringBadge")}</span>
                        ) : null}
                      </p>
                      {entry.note ? <p className="truncate text-xs text-muted-foreground">{entry.note}</p> : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-mono tabular-nums">{money(entry.amountKrw)}</span>
                      <button
                        type="button"
                        className="text-xs text-primary"
                        onClick={() => {
                          setEditingId(entry.id);
                          setEditDraft({
                            label: entry.label,
                            amount: String(entry.amountKrw),
                            note: entry.note,
                            recurring: entry.recurring,
                          });
                        }}
                      >
                        {t("marginEdit")}
                      </button>
                      <button type="button" className="text-xs text-destructive" onClick={() => void removeAdjustment(entry)}>
                        {t("marginDelete")}
                      </button>
                    </div>
                  </li>
                )
              )}
            </ul>
          )}
          <AdjustmentFields
            draft={addDraft}
            onChange={setAddDraft}
            onSubmit={() => void submitAdjustment(addDraft)}
            busy={busy}
            submitLabel={t("marginAdd")}
          />
        </div>
      </section>
    </div>
  );
}

function AdjustmentFields({
  draft,
  onChange,
  onSubmit,
  busy,
  submitLabel,
}: {
  draft: { label: string; amount: string; note: string; recurring: boolean };
  onChange: (draft: { label: string; amount: string; note: string; recurring: boolean }) => void;
  onSubmit: () => void;
  busy: boolean;
  submitLabel: string;
}) {
  const t = useTranslations("admin");

  return (
    <form
      className="space-y-2 rounded-xl border border-border p-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <input
        className={fieldClass}
        placeholder={t("marginLabelPlaceholder")}
        aria-label={t("marginLabel")}
        value={draft.label}
        onChange={(event) => onChange({ ...draft, label: event.target.value })}
      />
      <input
        className={fieldClass}
        inputMode="numeric"
        placeholder={t("marginAmount")}
        aria-label={t("marginAmount")}
        value={draft.amount}
        onChange={(event) => onChange({ ...draft, amount: event.target.value })}
      />
      <input
        className={fieldClass}
        placeholder={t("marginNote")}
        aria-label={t("marginNote")}
        value={draft.note}
        onChange={(event) => onChange({ ...draft, note: event.target.value })}
      />
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={draft.recurring}
          onChange={(event) => onChange({ ...draft, recurring: event.target.checked })}
        />
        {t("marginRecurring")}
      </label>
      <Button type="submit" size="sm" disabled={busy}>
        {submitLabel}
      </Button>
    </form>
  );
}
