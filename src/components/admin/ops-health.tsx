"use client";

import { AlertTriangle, Copy, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  dismissOpsBannerForToday,
  isOpsBannerDismissedToday,
  useOpsHealth,
} from "@/hooks/use-ops-health";
import { Link } from "@/i18n/navigation";
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

function bannerSummary(t: ReturnType<typeof useTranslations>, health: OpsHealth) {
  const parts: string[] = [];
  const lag = signalById(health, "traffic_sync_lag");
  const errorRate = signalById(health, "traffic_sync_error_rate");
  const active = signalById(health, "active_global_users");

  if (lag && lag.level !== "ok") {
    parts.push(t("ops.banner.lag", { minutes: formatLagMinutes(lag.valueSeconds) }));
  }
  if (errorRate && errorRate.level !== "ok") {
    parts.push(t("ops.banner.errorRate", { rate: formatPercent(errorRate.value) }));
  }
  if (active && active.level !== "ok") {
    parts.push(t("ops.banner.activeUsers", { count: active.value ?? 0 }));
  }
  if (health.provisionSimulate) {
    parts.push(t("ops.banner.simulate"));
  }
  if (!health.trafficSyncEnabled) {
    parts.push(t("ops.banner.syncOff"));
  }
  const neverRan = signalById(health, "traffic_sync_never_ran");
  if (neverRan && neverRan.level !== "ok") {
    parts.push(t("ops.banner.neverRan"));
  }

  return parts.join(" · ");
}

function cursorPrompt(t: ReturnType<typeof useTranslations>, health: OpsHealth) {
  const active = signalById(health, "active_global_users")?.value ?? 0;
  const errorRate = formatPercent(signalById(health, "traffic_sync_error_rate")?.value);
  const lag = formatLagMinutes(signalById(health, "traffic_sync_lag")?.valueSeconds);
  return t("ops.banner.cursorPrompt", { active, errorRate, lag });
}

export function Phase2OpsBanner({ owner }: { owner: boolean }) {
  const t = useTranslations("admin");
  const health = useOpsHealth(owner);
  const [hidden, setHidden] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (health?.overall === "warn") {
      setHidden(isOpsBannerDismissedToday());
    } else {
      setHidden(false);
    }
  }, [health?.overall]);

  if (!owner || !health || health.overall === "ok" || hidden) {
    return null;
  }

  const alert = health.overall === "alert";
  const summary = bannerSummary(t, health);

  async function copyPrompt() {
    const text = cursorPrompt(t, health!);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className={cn(
        "border-b px-4 py-3 md:px-8",
        alert
          ? "border-red-500/30 bg-red-500/10 text-red-100"
          : "border-amber-400/30 bg-amber-400/10 text-amber-100"
      )}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="size-4 shrink-0" />
            {t("ops.banner.title")}
          </p>
          {summary ? <p className="text-sm opacity-90">{summary}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-[10px]")}>
            {t("ops.banner.details")}
          </Link>
          <Button type="button" size="sm" variant="outline" className="rounded-[10px]" onClick={() => void copyPrompt()}>
            <Copy className="size-3.5" />
            {copied ? t("ops.banner.copied") : t("ops.banner.copyCursor")}
          </Button>
          {!alert ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="rounded-[10px]"
              onClick={() => {
                dismissOpsBannerForToday();
                setHidden(true);
              }}
            >
              <X className="size-3.5" />
              {t("ops.banner.dismissToday")}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
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
  const phase2Review =
    health.overall !== "ok" &&
    [active, errorRate, lag].some((signal) => signal && signal.level !== "ok");

  return (
    <article className="mb-6 rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">{t("ops.panel.title")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("ops.panel.subtitle")}</p>
        </div>
        {phase2Review ? (
          <span className="rounded-md border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-xs text-amber-200">
            {t("ops.panel.phase2Review")}
          </span>
        ) : null}
      </div>

      <dl className="mt-5 grid gap-4 md:grid-cols-4">
        <MetricCell
          label={t("ops.panel.activeGlobal")}
          value={String(active?.value ?? 0)}
          threshold={String(active?.threshold ?? 100)}
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
          level={lag?.level ?? (health.lastSyncAt ? "ok" : "warn")}
        />
        <MetricCell
          label={t("ops.panel.nextSync")}
          value={relativeUntil(health.nextSyncAt, t)}
          threshold={`${health.trafficSyncIntervalSeconds}s`}
          level={lag?.level ?? "ok"}
        />
      </dl>

      <div className="mt-5 flex flex-wrap gap-4 border-t border-border pt-4">
        {infraFlag(
          health.provisionSimulate ? t("ops.panel.provisionSimulate") : t("ops.panel.provisionLive"),
          !health.provisionSimulate
        )}
        {infraFlag(t("ops.panel.trafficSync"), health.trafficSyncEnabled)}
        {infraFlag(t("ops.panel.cron"), health.trafficSyncEnabled && Boolean(health.lastSyncAt))}
      </div>
    </article>
  );
}
