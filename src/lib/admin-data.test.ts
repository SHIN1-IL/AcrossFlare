import { Product, SubscriptionStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { toAdminCustomer } from "@/lib/admin-data";

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
