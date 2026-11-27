import { describe, expect, it } from "vitest";
import type { AdminCustomer } from "@/lib/admin";
import { filterAdminState } from "@/lib/admin-permissions";
import {
  adminServiceForCustomer,
  customerServicesForNodes,
  isAdminSliceFresh,
  mergeAdminCustomers,
  ADMIN_STATE_FRESH_MS,
} from "@/lib/admin-state";
import { marginAdjustmentWhere } from "@/lib/margin";
import { runsForOpsHealth, type TrafficSyncRunRow } from "@/lib/admin-ops-health";

function customer(patch: Partial<AdminCustomer> & Pick<AdminCustomer, "id" | "planId">): AdminCustomer {
  return {
    product: "global",
    email: `${patch.id}@example.com`,
    planName: "",
    expiresAt: "",
    memo: "",
    status: "active",
    nodeIds: [],
    failover: false,
    createdAt: "",
    signedUpAt: "",
    signupOnly: false,
    demo: false,
    credentials: null,
    rotateHistory: [],
    planChange: null,
    provisionStep: "",
    provisionError: "",
    payments: [],
    auditLogs: [],
    ...patch,
  };
}

describe("mergeAdminCustomers", () => {
  it("replaces one service and keeps the other", () => {
    const standard = customer({ id: "s", planId: "global-lite" });
    const hybrid = customer({ id: "h", planId: "hybrid-lite", email: "h@example.com" });
    const nextStandard = customer({ id: "s2", planId: "global-lite" });
    const merged = mergeAdminCustomers([standard, hybrid], "standard", [nextStandard]);
    expect(merged.map((item) => item.id).sort()).toEqual(["h", "s2"]);
  });

  it("keeps an open detail when the list has no credentials or payments", () => {
    const detail = customer({
      id: "s",
      planId: "global-lite",
      credentials: { uuid: "secret" } as AdminCustomer["credentials"],
      payments: [{ id: "pay" } as AdminCustomer["payments"][number]],
      rotateHistory: [{ id: "rot", at: "", fromIp: "", toIp: "" }],
    });
    const list = customer({ id: "s", planId: "global-lite" });
    const merged = mergeAdminCustomers([detail], "standard", [list]);
    expect(merged[0]?.credentials).toEqual({ uuid: "secret" });
    expect(merged[0]?.payments).toEqual([{ id: "pay" }]);
    expect(merged[0]?.rotateHistory).toEqual([{ id: "rot", at: "", fromIp: "", toIp: "" }]);
  });

  it("treats signup-only rows as Standard", () => {
    expect(adminServiceForCustomer({ signupOnly: true, planId: "" })).toBe("standard");
    expect(customerServicesForNodes("standard")).toEqual(["standard", "hybrid"]);
    expect(customerServicesForNodes("workspace")).toEqual(["workspace"]);
  });
});

describe("isAdminSliceFresh", () => {
  it("reuses a slice for 30 seconds unless a refresh is forced", () => {
    const loadedAt = 1_000;
    expect(isAdminSliceFresh(loadedAt, loadedAt + ADMIN_STATE_FRESH_MS - 1)).toBe(true);
    expect(isAdminSliceFresh(loadedAt, loadedAt + ADMIN_STATE_FRESH_MS)).toBe(false);
    expect(isAdminSliceFresh(loadedAt, loadedAt + 1, true)).toBe(false);
    expect(isAdminSliceFresh(undefined, 1)).toBe(false);
  });
});

describe("filterAdminState", () => {
  it("leaves out slices the screen did not ask for", () => {
    const filtered = filterAdminState({ plans: [1] }, ["nodes"]);
    expect(filtered).toEqual({ plans: [] });
    expect("bootstrapJobs" in filtered).toBe(false);
    expect("customers" in filtered).toBe(false);
  });

  it("hides bootstrap jobs from staff who cannot see nodes", () => {
    expect(filterAdminState({ bootstrapJobs: [{ id: "job" }] }, ["customers"]).bootstrapJobs).toEqual([]);
    expect(filterAdminState({ bootstrapJobs: [{ id: "job" }] }, ["nodes"]).bootstrapJobs).toEqual([{ id: "job" }]);
  });
});

describe("marginAdjustmentWhere", () => {
  it("keeps recurring adjustments that started in an earlier month", () => {
    expect(marginAdjustmentWhere("2026-11")).toEqual({
      OR: [
        { recurring: true, month: { lte: "2026-11" } },
        { recurring: false, month: "2026-11" },
      ],
    });
  });
});

describe("runsForOpsHealth", () => {
  it("keeps the last 24 hours and the one run before that window", () => {
    const now = new Date("2026-08-31T12:00:00.000Z");
    const runs: TrafficSyncRunRow[] = [
      { completedAt: new Date("2026-08-31T11:00:00.000Z"), subscriptions: 2, errors: 0 },
      { completedAt: new Date("2026-08-30T11:00:00.000Z"), subscriptions: 2, errors: 1 },
      { completedAt: new Date("2026-08-28T12:00:00.000Z"), subscriptions: 2, errors: 9 },
    ];
    expect(runsForOpsHealth(runs, now).map((run) => run.errors)).toEqual([0, 1]);
  });
});
