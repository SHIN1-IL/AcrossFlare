"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { fieldClass } from "@/components/admin/admin-drawer";
import { Button } from "@/components/ui/button";
import { refreshAdmin } from "@/lib/admin-store";
import { HYBRID_SEATS_MAX, HYBRID_SELECTABLE_MAX, HYBRID_SELECTABLE_MIN } from "@/lib/provision/capacity-expand";

const nodeChoices = Array.from(
  { length: HYBRID_SELECTABLE_MAX - HYBRID_SELECTABLE_MIN + 1 },
  (_, index) => HYBRID_SELECTABLE_MIN + index
);
const seatChoices = Array.from({ length: HYBRID_SEATS_MAX }, (_, index) => index + 1);

export function HybridTeamLimits({
  maxSelectable,
  teamSeatsMax,
}: {
  maxSelectable: number;
  teamSeatsMax: number;
}) {
  const t = useTranslations("admin");
  const [nodes, setNodes] = useState(String(maxSelectable));
  const [seats, setSeats] = useState(String(teamSeatsMax));
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  function startEdit() {
    setNodes(String(maxSelectable));
    setSeats(String(teamSeatsMax));
    setError("");
    setSaved(false);
    setEditing(true);
  }

  async function save() {
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const response = await fetch("/api/v1/admin/capacity/hybrid", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxSelectable: Number(nodes), seatsMax: Number(seats) }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(data?.error === "seats_below_used" ? t("hybridSeatsBelowUsed") : t("hybridLimitsFailed"));
        return;
      }
      await refreshAdmin();
      setEditing(false);
      setSaved(true);
    } catch {
      setError(t("hybridLimitsFailed"));
    } finally {
      setBusy(false);
    }
  }

  function cancel() {
    setNodes(String(maxSelectable));
    setSeats(String(teamSeatsMax));
    setError("");
    setSaved(false);
    setEditing(false);
  }

  return (
    <div className="mt-3 space-y-3 border-t border-border pt-3">
      <p className="text-xs text-muted-foreground">
        {t("hybridSelectableLabel")} <span className="font-medium text-foreground">{maxSelectable}</span>
      </p>
      <p className="text-xs text-muted-foreground">
        {t("hybridSeatsLabel")} <span className="font-medium text-foreground">{teamSeatsMax}</span>
      </p>
      {editing ? (
        <>
          <label className="block text-xs text-muted-foreground">
            {t("hybridSelectableLabel")}
            <select
              className={`${fieldClass} mt-1`}
              value={nodes}
              onChange={(event) => setNodes(event.target.value)}
            >
              {nodeChoices.map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs leading-5 text-muted-foreground">{t("hybridSelectableHint")}</p>
          <label className="block text-xs text-muted-foreground">
            {t("hybridSeatsLabel")}
            <select
              className={`${fieldClass} mt-1`}
              value={seats}
              onChange={(event) => setSeats(event.target.value)}
            >
              {seatChoices.map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs leading-5 text-muted-foreground">{t("hybridSeatsHint")}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" className="rounded-[10px]" disabled={busy} onClick={() => void save()}>
              {t("hybridLimitsSave")}
            </Button>
            <Button type="button" variant="outline" className="rounded-[10px]" disabled={busy} onClick={cancel}>
              {t("hybridLimitsCancel")}
            </Button>
          </div>
        </>
      ) : (
        <Button type="button" variant="outline" className="rounded-[10px]" onClick={startEdit}>
          {t("hybridLimitsEdit")}
        </Button>
      )}
      {saved ? <p className="text-xs text-primary">{t("hybridLimitsSaved")}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
