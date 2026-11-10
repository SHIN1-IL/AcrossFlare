"use client";

import { useTranslations } from "next-intl";
import { useOpsHealth } from "@/hooks/use-ops-health";
import type { OpsHealth, SignalLevel } from "@/lib/admin-ops-health";
import { cn } from "@/lib/utils";

function signalById(health: OpsHealth, id: string) {
  return health.signals.find((signal) => signal.id === id);
}

function formatPercent(value: number | undefined) {
  if (value === undefined) {
    return "—";
  }
  return `${Math.round(value * 100)}%`;
}

function formatLagMinutes(seconds: number | undefined) {
  if (seconds === undefined) {
    return "—";
  }
  return `${Math.max(1, Math.round(seconds / 60))}`;
}

function levelEmoji(level: SignalLevel) {
  if (level === "alert") {
    return "🔴";
  }
  if (level === "warn") {
    return "🟡";
  }
  return "🟢";
}

function MetricCell({
  label,
  value,
  threshold,
  level,
}: {
  label: string;
  value: string;
  threshold: string;
  level: SignalLevel;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-mono text-sm">
        {value} / {threshold} {levelEmoji(level)}
      </dd>
    </div>
  );
}

function relativeFromNow(iso: string | null, t: ReturnType<typeof useTranslations>) {
  if (!iso) {
    return t("ops.panel.none");
  }
  const deltaSeconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (deltaSeconds < 60) {
    return t("ops.panel.justNow");
  }
  const minutes = Math.round(deltaSeconds / 60);
  if (minutes < 120) {
    return t("ops.panel.minutesAgo", { count: minutes });
  }
  const hours = Math.round(minutes / 60);
  return t("ops.panel.hoursAgo", { count: hours });
}

function relativeUntil(iso: string | null, t: ReturnType<typeof useTranslations>) {
  if (!iso) {
    return t("ops.panel.none");
  }
  const deltaSeconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  if (deltaSeconds <= 0) {
    return t("ops.panel.dueNow");
  }
  const minutes = Math.max(1, Math.round(deltaSeconds / 60));
  return t("ops.panel.minutesUntil", { count: minutes });
}

function infraFlag(label: string, ok: boolean) {
  return (
    <span className={cn("font-mono text-xs", ok ? "text-primary" : "text-red-300")}>
      {label} {ok ? "✓" : "✗"}
    </span>
  );
}

export function OpsHealthPanel({ owner }: { owner: boolean }) {
  const t = useTranslations("admin");
  const health = useOpsHealth(owner);

  if (!owner || !health) {
    return null;
  }

  const active = signalById(health, "active_global_users");
  const errorRate = signalById(health, "traffic_sync_error_rate");
  const lag = signalById(health, "traffic_sync_lag");
  const neverRan = signalById(health, "traffic_sync_never_ran");

  return (
    <article className="mb-6 rounded-2xl border border-border bg-card p-5">
      <div>
        <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">{t("ops.panel.title")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("ops.panel.subtitle")}</p>
      </div>

      <dl className="mt-5 grid gap-4 md:grid-cols-4">
        <MetricCell
          label={t("ops.panel.activeGlobal")}
          value={String(active?.value ?? 0)}
          threshold={t("ops.panel.alertThreshold", { count: active?.threshold ?? 100 })}
          level={active?.level ?? "ok"}
        />
        <MetricCell
          label={t("ops.panel.errorRate")}
          value={formatPercent(errorRate?.value)}
          threshold={formatPercent(errorRate?.threshold)}
          level={errorRate?.level ?? "ok"}
        />
        <MetricCell
          label={t("ops.panel.lastSync")}
          value={relativeFromNow(health.lastSyncAt, t)}
          threshold={formatLagMinutes(lag?.thresholdSeconds)}
          level={lag?.level ?? neverRan?.level ?? "ok"}
        />
        <MetricCell
          label={t("ops.panel.nextSync")}
          value={relativeUntil(health.nextSyncAt, t)}
          threshold={`${health.trafficSyncIntervalSeconds}s`}
          level={lag?.level ?? "ok"}
        />
      </dl>

      <div className="mt-5 flex flex-wrap gap-4 border-t border-border pt-4">
        {health.provisionSimulate
          ? infraFlag(t("ops.panel.provisionSimulate"), false)
          : null}
        {infraFlag(t("ops.panel.trafficSync"), health.trafficSyncEnabled)}
        {infraFlag(
          t("ops.panel.cron"),
          Boolean(health.lastSyncAt) || neverRan?.level === "ok"
        )}
      </div>
    </article>
  );
}
