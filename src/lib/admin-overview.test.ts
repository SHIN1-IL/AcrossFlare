import { describe, expect, it } from "vitest";
import type { AdminBootstrapJob, AdminPoolCapacity } from "@/lib/admin";
import { jobsForAdminService, nodesForAdminService, poolsForAdminService } from "@/lib/admin-overview";

function pool(
  id: string,
  product = "GLOBAL",
  groups: AdminPoolCapacity["groups"] = [],
): AdminPoolCapacity {
  return {
    id,
    product,
    name: id,
    maxSelectable: 1,
    teamSeatsMax: 10,
    seatsUsed: 1,
    seatsMax: 10,
    seatsRemaining: 9,
    seatsTest: 0,
    full: false,
    neededSlots: [],
    recentBootstrapFailures: 0,
    groups,
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

  it("lists only the nodes that belong to the selected standard or hybrid pool", () => {
    const grouped = [
      pool("global-standard", "GLOBAL", [
        {
          id: "std-1",
          name: "Standard",
          status: "READY",
          seatsUsed: 1,
          seatsMax: 10,
          nodes: [
            { id: "la-b", name: "LA(B)-Bandwagon", ddns: "node-la-b.example.com", role: "primary" },
            { id: "odd", name: "Spare-1", ddns: "spare.example.com", role: "failover" },
          ],
        },
      ]),
      pool("global-hybrid", "GLOBAL", [
        {
          id: "hy-1",
          name: "Hybrid",
          status: "READY",
          seatsUsed: 2,
          seatsMax: 10,
          nodes: [
            { id: "tokyo", name: "Tokyo-Bandwagon", ddns: "node-tokyo.example.com", role: "primary" },
            { id: "la-a", name: "LA(A)-Bandwagon", ddns: "node-la-a.example.com", role: "primary" },
          ],
        },
      ]),
    ];
    const nodes = [
      { id: "la-b", product: "global" as const, name: "LA(B)-Bandwagon", role: "primary" as const },
      { id: "la-a", product: "global" as const, name: "LA(A)-Bandwagon", role: "primary" as const },
      { id: "tokyo", product: "global" as const, name: "Tokyo-Bandwagon", role: "primary" as const },
      { id: "tokyo-rn", product: "global" as const, name: "Tokyo-RackNerd", role: "failover" as const },
      { id: "la-rn", product: "global" as const, name: "LA-RackNerd", role: "failover" as const },
      { id: "odd", product: "global" as const, name: "Spare-1", role: "failover" as const },
      { id: "ws", product: "workspace" as const, name: "Desk", role: "primary" as const },
    ];

    expect(nodesForAdminService("standard", nodes, grouped).map((node) => node.id)).toEqual(["la-b", "odd"]);
    expect(nodesForAdminService("hybrid", nodes, grouped).map((node) => node.id)).toEqual(["la-a", "tokyo"]);
    expect(nodesForAdminService("workspace", nodes, grouped).map((node) => node.id)).toEqual(["ws"]);
  });
});
