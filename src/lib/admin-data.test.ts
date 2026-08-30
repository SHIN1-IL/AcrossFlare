import { NodeHealth, NodeRole, Product, SubscriptionStatus, type Node } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { toAdminCustomer, toAdminNode } from "@/lib/admin-data";

const row = {
  id: "sub1",
  userId: "u1",
  planId: "global-lite",
  product: Product.GLOBAL,
  status: SubscriptionStatus.ACTIVE,
  expiresAt: new Date("2026-09-01T00:00:00.000Z"),
  memo: "",
  provisionStep: "ready",
  provisionError: "",
  trafficUsedGb: 0,
  backupUsedGb: 0,
  failover: false,
  createdAt: new Date("2026-08-01T00:00:00.000Z"),
  updatedAt: new Date("2026-08-01T00:00:00.000Z"),
  user: { email: "a@example.com" },
  plan: { name: "Month", nodeCodes: ["LA"] },
  nodes: [{ id: "n1", ddns: "node.example.com" }],
  credentials: {
    uuid: "uuid-1",
    deepLink: "vless://secret",
    yamlToken: "tok",
    yamlBody: "proxies:",
    vaultUrl: "https://vault.example",
    syncthingUrl: "https://sync.example",
    syncthingFolderId: "folder",
  },
  rotateEvents: [{ id: "r1", createdAt: new Date("2026-08-02T00:00:00.000Z"), fromIp: "1.1.1.1", toIp: "2.2.2.2" }],
  payments: [
    {
      id: "p1",
      amount: 19900,
      currency: "KRW",
      method: "CARD",
      provider: "PORTONE",
      status: "SUCCEEDED",
      createdAt: new Date("2026-08-01T00:00:00.000Z"),
    },
  ],
} as never;

describe("toAdminCustomer", () => {
  it("strips secrets and payments from list rows", () => {
    const customer = toAdminCustomer(row, false);
    expect(customer.credentials).toBe(null);
    expect(customer.rotateHistory).toEqual([]);
    expect(customer.payments).toEqual([]);
    expect(customer.email).toBe("a@example.com");
    expect(customer.provisionStep).toBe("ready");
  });

  it("includes credentials and payments on detail rows", () => {
    const customer = toAdminCustomer(row, true);
    expect(customer.credentials).toMatchObject({ kind: "global", deepLink: "vless://secret" });
    expect(customer.rotateHistory).toHaveLength(1);
    expect(customer.payments).toEqual([
      {
        id: "p1",
        amount: 19900,
        currency: "KRW",
        method: "card",
        provider: "portone",
        status: "succeeded",
        createdAt: "2026-08-01T00:00:00.000Z",
      },
    ]);
  });
});

describe("toAdminNode", () => {
  it("masks the panel host and flags seed nodes as unwired", () => {
    const node = {
      id: "g-tokyo-bw",
      product: Product.GLOBAL,
      name: "Tokyo-Bandwagon",
      ddns: "node-tokyo.acrossflare.com",
      role: NodeRole.BANDWAGON,
      status: NodeHealth.ONLINE,
      host: "10.0.0.22",
      port: 2053,
      username: "admin",
      password: "seed-only",
      inboundId: null,
      createdAt: new Date("2026-08-01T00:00:00.000Z"),
      updatedAt: new Date("2026-08-01T00:00:00.000Z"),
    } satisfies Node;

    expect(toAdminNode(node)).toMatchObject({
      hostMasked: "•••.•••.•••.22",
      port: 2053,
      inboundId: null,
      wiring: "placeholder",
    });
  });
});
