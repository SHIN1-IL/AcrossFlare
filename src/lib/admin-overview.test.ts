import { describe, expect, it } from "vitest";
import type { AdminBootstrapJob, AdminPoolCapacity } from "@/lib/admin";
import { jobsForAdminService, poolsForAdminService } from "@/lib/admin-overview";

function pool(id: string, product = "GLOBAL"): AdminPoolCapacity {
  return {
    id,
    product,
    name: id,
    maxSelectable: 1,
    teamSeatsMax: 10,
    seatsUsed: 1,
    seatsMax: 10,
    seatsRemaining: 9,
    full: false,
    neededSlots: [],
    recentBootstrapFailures: 0,
    groups: [],
  };
}

function job(partial: Partial<AdminBootstrapJob> & Pick<AdminBootstrapJob, "id" | "product">): AdminBootstrapJob {
  return {
    status: "queued",
    role: "primary",
    provider: "",
    poolId: null,
    groupId: null,
    name: partial.id,
    ddnsHost: "node.example.com",
    sshHost: "203.0.113.10",
    sshPort: 22,
    nodeId: null,
    log: "",
    error: "",
    createdAt: "2026-10-16T00:00:00.000Z",
    completedAt: null,
    ...partial,
  };
}

describe("admin overview slices", () => {
  const pools = [
    pool("global-standard"),
    pool("global-hybrid"),
    pool("marketing-default", "MARKETING"),
  ];

  it("keeps each service on its own seat pool", () => {
    expect(poolsForAdminService("standard", pools).map((item) => item.id)).toEqual(["global-standard"]);
    expect(poolsForAdminService("hybrid", pools).map((item) => item.id)).toEqual(["global-hybrid"]);
    expect(poolsForAdminService("workspace", pools).map((item) => item.id)).toEqual(["marketing-default"]);
  });

  it("routes bootstrap jobs by pool, and unassigned global jobs to standard", () => {
    const jobs = [
      job({ id: "std", product: "GLOBAL", poolId: "global-standard" }),
      job({ id: "hy", product: "GLOBAL", poolId: "global-hybrid" }),
      job({ id: "loose", product: "global" }),
      job({ id: "mkt", product: "MARKETING", poolId: "marketing-default" }),
    ];
    expect(jobsForAdminService("standard", jobs).map((item) => item.id)).toEqual(["std", "loose"]);
    expect(jobsForAdminService("hybrid", jobs).map((item) => item.id)).toEqual(["hy"]);
    expect(jobsForAdminService("workspace", jobs).map((item) => item.id)).toEqual(["mkt"]);
  });
});
