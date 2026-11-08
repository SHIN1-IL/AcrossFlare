import { describe, expect, it } from "vitest";
import type { AdminPoolCapacity } from "@/lib/admin";
import { adminQueueCounts } from "@/lib/admin-queue";
import { buildAdminHomeSummary, presentAdminHomeSummary } from "@/lib/admin-home-summary";

const NOW = Date.parse("2026-08-01T00:00:00.000Z");

function pool(id: string, seatsRemaining: number): AdminPoolCapacity {
  return {
    id,
    product: "GLOBAL",
    name: id,
    maxSelectable: 1,
    teamSeatsMax: 10,
    seatsUsed: 1,
    seatsMax: 10,
    seatsRemaining,
    full: seatsRemaining === 0,
    neededSlots: [],
    recentBootstrapFailures: 0,
    groups: [
      {
        id: "group",
        name: "group",
        status: "ready",
        seatsUsed: 1,
        seatsMax: 10,
        nodes: [],
      },
    ],
  };
}

describe("buildAdminHomeSummary", () => {
  it("counts each service with the customer-table queue rules", () => {
    const summary = buildAdminHomeSummary({
      now: NOW,
      signupOnlyCount: 2,
      planIds: ["global-lite", "hybrid-lite", "custom-old"],
      globalNodeCount: 4,
      workspaceNodeCount: 1,
      capacityPools: [pool("global-standard", 3), pool("global-hybrid", 5)],
      bootstrapQuota: { used: 1, limit: 20, recentFailures: 0 },
      subscriptions: [
        { status: "active", expiresAt: "2026-08-04T00:00:00.000Z", planId: "global-lite" },
        { status: "failed", expiresAt: "2026-09-01T00:00:00.000Z", planId: "global-lite" },
        { status: "unpaid", expiresAt: "2026-09-01T00:00:00.000Z", planId: "hybrid-lite" },
        { status: "provisioning", expiresAt: "2026-09-01T00:00:00.000Z", planId: "workspace-a" },
      ],
    });

    expect(summary.services.standard.customerCount).toBe(4);
    expect(summary.services.standard.planCount).toBe(1);
    expect(summary.services.standard.nodeCount).toBe(4);
    expect(summary.services.standard.seatsRemaining).toBe(3);
    expect(summary.services.standard.queue).toEqual({
      failed: 1,
      provisioning: 0,
      unpaid: 0,
      expiring: 1,
    });
    expect(summary.services.hybrid.customerCount).toBe(1);
    expect(summary.services.hybrid.queue.unpaid).toBe(1);
    expect(summary.services.hybrid.nodeCount).toBe(4);
    expect(summary.services.hybrid.seatsRemaining).toBe(5);
    expect(summary.services.workspace.customerCount).toBe(1);
    expect(summary.services.workspace.queue.provisioning).toBe(1);
    expect(summary.services.workspace.nodeCount).toBe(1);
    expect(summary.services.workspace.planCount).toBe(0);
    expect(summary.capacityPools[0]?.groups).toEqual([]);

    const standardQueue = adminQueueCounts(
      [
        {
          id: "1",
          product: "global",
          email: "a@example.com",
          planId: "global-lite",
          planName: "Month",
          expiresAt: "2026-08-04T00:00:00.000Z",
          memo: "",
          status: "active",
          nodeIds: [],
          failover: false,
          createdAt: "",
          signedUpAt: "",
          signupOnly: false,
          credentials: null,
          rotateHistory: [],
          planChange: null,
          provisionStep: "ready",
          provisionError: "",
          payments: [],
          auditLogs: [],
        },
        {
          id: "2",
          product: "global",
          email: "b@example.com",
          planId: "global-lite",
          planName: "Month",
          expiresAt: "2026-09-01T00:00:00.000Z",
          memo: "",
          status: "failed",
          nodeIds: [],
          failover: false,
          createdAt: "",
          signedUpAt: "",
          signupOnly: false,
          credentials: null,
          rotateHistory: [],
          planChange: null,
          provisionStep: "ready",
          provisionError: "",
          payments: [],
          auditLogs: [],
        },
      ],
      NOW
    );
    expect(summary.services.standard.queue.failed).toBe(standardQueue.failed);
    expect(summary.services.standard.queue.expiring).toBe(standardQueue.expiring);
  });
});

describe("presentAdminHomeSummary", () => {
  it("hides counts the staff member cannot see", () => {
    const summary = buildAdminHomeSummary({
      signupOnlyCount: 1,
      planIds: ["global-lite"],
      globalNodeCount: 2,
      workspaceNodeCount: 0,
      capacityPools: [pool("global-standard", 3)],
      bootstrapQuota: { used: 20, limit: 20, recentFailures: 4 },
      subscriptions: [{ status: "failed", expiresAt: "2026-09-01T00:00:00.000Z", planId: "global-lite" }],
    });

    const hidden = presentAdminHomeSummary(summary, ["codes"]);
    expect(hidden.services.standard.customerCount).toBe(0);
    expect(hidden.services.standard.queue.failed).toBe(0);
    expect(hidden.services.standard.planCount).toBe(0);
    expect(hidden.services.standard.nodeCount).toBe(0);
    expect(hidden.services.standard.seatsRemaining).toBe(0);
    expect(hidden.capacityPools).toEqual([]);
    expect(hidden.bootstrapQuota.used).toBe(0);
    expect(hidden.bootstrapQuota.limit).toBe(20);

    const customersOnly = presentAdminHomeSummary(summary, ["customers"]);
    expect(customersOnly.services.standard.customerCount).toBe(2);
    expect(customersOnly.services.standard.planCount).toBe(0);
    expect(customersOnly.services.standard.nodeCount).toBe(0);
    expect(customersOnly.services.standard.seatsRemaining).toBe(3);
    expect(customersOnly.capacityPools).toHaveLength(1);
  });
});
