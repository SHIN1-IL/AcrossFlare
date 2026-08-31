import { Product, SubscriptionStatus } from "@prisma/client";
import { adminServiceFromPlanId } from "@/lib/admin-service";
import { prisma } from "@/lib/db";
import {
  isProvisionSimulate,
  isTrafficSyncEnabled,
  trafficSyncIntervalSeconds,
} from "@/lib/provision/config";

export type SignalLevel = "ok" | "warn" | "alert";

export type OpsSignal = {
  id: string;
  level: SignalLevel;
  value?: number;
  threshold?: number;
  valueSeconds?: number;
  thresholdSeconds?: number;
  lastRunAt?: string;
  windowHours?: number;
  messageKey?: string;
};

export type OpsHealth = {
  phase: 1;
  overall: SignalLevel;
  signals: OpsSignal[];
  provisionSimulate: boolean;
  trafficSyncEnabled: boolean;
  trafficSyncIntervalSeconds: number;
  lastSyncAt: string | null;
  nextSyncAt: string | null;
  recommendationKey: string | null;
};

export type TrafficSyncRunRow = {
  completedAt: Date;
  subscriptions: number;
  errors: number;
};

export type OpsHealthInputs = {
  activeGlobalUsers: number;
  syncRuns: TrafficSyncRunRow[];
  provisionSimulate: boolean;
  trafficSyncEnabled: boolean;
  trafficSyncIntervalSeconds: number;
  now?: Date;
};

const ACTIVE_USERS_WARN = 80;
const ACTIVE_USERS_ALERT = 100;
const ERROR_RATE_ALERT = 0.1;
const ERROR_RATE_MIN_RUNS = 12;
const ERROR_RATE_WINDOW_HOURS = 24;
const LAG_ALERT_SECONDS = 600;

function maxLevel(a: SignalLevel, b: SignalLevel): SignalLevel {
  if (a === "alert" || b === "alert") {
    return "alert";
  }
  if (a === "warn" || b === "warn") {
    return "warn";
  }
  return "ok";
}

function overallFromSignals(signals: OpsSignal[]): SignalLevel {
  return signals.reduce<SignalLevel>((level, signal) => maxLevel(level, signal.level), "ok");
}

export function computeOpsHealth(inputs: OpsHealthInputs): OpsHealth {
  const now = inputs.now ?? new Date();
  const signals: OpsSignal[] = [];

  const activeLevel: SignalLevel =
    inputs.activeGlobalUsers >= ACTIVE_USERS_ALERT
      ? "alert"
      : inputs.activeGlobalUsers >= ACTIVE_USERS_WARN
        ? "warn"
        : "ok";
  signals.push({
    id: "active_global_users",
    level: activeLevel,
    value: inputs.activeGlobalUsers,
    threshold: ACTIVE_USERS_ALERT,
    messageKey: "ops.signal.activeUsers",
  });

  if (inputs.provisionSimulate) {
    signals.push({
      id: "provision_simulate",
      level: "alert",
      messageKey: "ops.signal.provisionSimulate",
    });
  }

  if (!inputs.trafficSyncEnabled) {
    signals.push({
      id: "traffic_sync_disabled",
      level: "alert",
      messageKey: "ops.signal.trafficSyncDisabled",
    });
  }

  const sortedRuns = [...inputs.syncRuns].sort(
    (a, b) => b.completedAt.getTime() - a.completedAt.getTime()
  );
  const lastRun = sortedRuns[0] ?? null;
  const lastSyncAt = lastRun?.completedAt.toISOString() ?? null;
  const nextSyncAt = lastRun
    ? new Date(lastRun.completedAt.getTime() + inputs.trafficSyncIntervalSeconds * 1000).toISOString()
    : null;

  const windowStart = new Date(now.getTime() - ERROR_RATE_WINDOW_HOURS * 60 * 60 * 1000);
  const windowRuns = sortedRuns.filter((run) => run.completedAt >= windowStart);

  if (inputs.trafficSyncEnabled && windowRuns.length >= ERROR_RATE_MIN_RUNS) {
    const rates = windowRuns.map((run) => run.errors / Math.max(run.subscriptions, 1));
    const avgErrorRate = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
    signals.push({
      id: "traffic_sync_error_rate",
      level: avgErrorRate >= ERROR_RATE_ALERT ? "alert" : "ok",
      value: Number(avgErrorRate.toFixed(4)),
      threshold: ERROR_RATE_ALERT,
      windowHours: ERROR_RATE_WINDOW_HOURS,
      messageKey: "ops.signal.errorRate",
    });
  } else if (inputs.trafficSyncEnabled) {
    signals.push({
      id: "traffic_sync_error_rate",
      level: "ok",
      value: 0,
      threshold: ERROR_RATE_ALERT,
      windowHours: ERROR_RATE_WINDOW_HOURS,
      messageKey: "ops.signal.errorRate",
    });
  }

  if (inputs.trafficSyncEnabled && lastRun) {
    const lagSeconds = Math.max(0, Math.floor((now.getTime() - lastRun.completedAt.getTime()) / 1000));
    const previousRun = sortedRuns[1] ?? null;
    const previousGapSeconds = previousRun
      ? Math.max(
          0,
          Math.floor((lastRun.completedAt.getTime() - previousRun.completedAt.getTime()) / 1000)
        )
      : 0;

    const lastLate = lagSeconds > LAG_ALERT_SECONDS;
    const previousLate = previousRun !== null && previousGapSeconds > LAG_ALERT_SECONDS;

    signals.push({
      id: "traffic_sync_lag",
      level: lastLate && previousLate ? "alert" : lastLate ? "warn" : "ok",
      valueSeconds: lagSeconds,
      thresholdSeconds: LAG_ALERT_SECONDS,
      lastRunAt: lastSyncAt ?? undefined,
      messageKey: "ops.signal.syncLag",
    });
  } else if (inputs.trafficSyncEnabled) {
    const shouldHaveRun = inputs.activeGlobalUsers > 0;
    signals.push({
      id: "traffic_sync_never_ran",
      level: shouldHaveRun ? "alert" : "ok",
      messageKey: "ops.signal.neverRan",
    });
  }

  const overall = overallFromSignals(signals);
  const phase2Signals = signals.filter((signal) =>
    ["active_global_users", "traffic_sync_error_rate", "traffic_sync_lag"].includes(signal.id)
  );
  const phase2Level = overallFromSignals(phase2Signals);

  return {
    phase: 1,
    overall,
    signals,
    provisionSimulate: inputs.provisionSimulate,
    trafficSyncEnabled: inputs.trafficSyncEnabled,
    trafficSyncIntervalSeconds: inputs.trafficSyncIntervalSeconds,
    lastSyncAt,
    nextSyncAt,
    recommendationKey:
      phase2Level !== "ok" ? "ops.recommend.phase2" : overall !== "ok" ? "ops.recommend.infra" : null,
  };
}

export async function getOpsHealth(): Promise<OpsHealth> {
  const [activeGlobalUsers, syncRuns] = await Promise.all([
    prisma.subscription.count({
      where: {
        status: SubscriptionStatus.ACTIVE,
        product: Product.GLOBAL,
      },
    }),
    prisma.trafficSyncRun.findMany({
      where: {
        completedAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { completedAt: "desc" },
      take: 500,
      select: {
        completedAt: true,
        subscriptions: true,
        errors: true,
      },
    }),
  ]);

  return computeOpsHealth({
    activeGlobalUsers,
    syncRuns,
    provisionSimulate: isProvisionSimulate(),
    trafficSyncEnabled: isTrafficSyncEnabled(),
    trafficSyncIntervalSeconds: trafficSyncIntervalSeconds(),
  });
}

export function countActiveGlobalUsers(
  customers: Array<{ product: string; status: string; planId: string }>
) {
  return customers.filter(
    (customer) =>
      customer.product === "global" &&
      customer.status === "active" &&
      adminServiceFromPlanId(customer.planId) !== "workspace"
  ).length;
}
