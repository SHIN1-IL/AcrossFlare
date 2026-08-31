import { describe, expect, it } from "vitest";
import { computeOpsHealth, type TrafficSyncRunRow } from "@/lib/admin-ops-health";

function run(completedAt: Date, subscriptions: number, errors: number): TrafficSyncRunRow {
  return { completedAt, subscriptions, errors };
}

describe("computeOpsHealth", () => {
  const baseNow = new Date("2026-08-31T12:00:00.000Z");

  it("warns and alerts on active global user thresholds", () => {
    const warn = computeOpsHealth({
      activeGlobalUsers: 85,
      syncRuns: [],
      provisionSimulate: false,
      trafficSyncEnabled: true,
      trafficSyncIntervalSeconds: 300,
      now: baseNow,
    });
    expect(warn.signals.find((item) => item.id === "active_global_users")?.level).toBe("warn");

    const alert = computeOpsHealth({
      activeGlobalUsers: 103,
      syncRuns: [],
      provisionSimulate: false,
      trafficSyncEnabled: true,
      trafficSyncIntervalSeconds: 300,
      now: baseNow,
    });
    expect(alert.signals.find((item) => item.id === "active_global_users")?.level).toBe("alert");
    expect(alert.overall).toBe("alert");
  });

  it("alerts on sustained sync lag", () => {
    const health = computeOpsHealth({
      activeGlobalUsers: 10,
      syncRuns: [
        run(new Date("2026-08-31T11:40:00.000Z"), 20, 0),
        run(new Date("2026-08-31T11:20:00.000Z"), 20, 0),
      ],
      provisionSimulate: false,
      trafficSyncEnabled: true,
      trafficSyncIntervalSeconds: 300,
      now: baseNow,
    });

    expect(health.signals.find((item) => item.id === "traffic_sync_lag")?.level).toBe("alert");
  });

  it("requires enough runs before error-rate alert", () => {
    const runs = Array.from({ length: 12 }, (_, index) =>
      run(new Date(baseNow.getTime() - index * 5 * 60 * 1000), 10, 2)
    );

    const health = computeOpsHealth({
      activeGlobalUsers: 10,
      syncRuns: runs,
      provisionSimulate: false,
      trafficSyncEnabled: true,
      trafficSyncIntervalSeconds: 300,
      now: baseNow,
    });

    expect(health.signals.find((item) => item.id === "traffic_sync_error_rate")?.level).toBe("alert");
  });

  it("flags infra pre-warnings", () => {
    const health = computeOpsHealth({
      activeGlobalUsers: 5,
      syncRuns: [],
      provisionSimulate: true,
      trafficSyncEnabled: false,
      trafficSyncIntervalSeconds: 300,
      now: baseNow,
    });

    expect(health.signals.find((item) => item.id === "provision_simulate")?.level).toBe("alert");
    expect(health.signals.find((item) => item.id === "traffic_sync_disabled")?.level).toBe("alert");
  });
});
