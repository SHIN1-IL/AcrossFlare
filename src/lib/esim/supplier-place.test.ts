import { describe, expect, it, vi } from "vitest";
import { parseSupplierBody, SupplierRequestError, type SupplierClient, type SupplierProfile } from "@/lib/esim/access-client";
import type { SupplierPackage } from "@/lib/esim/supplier-policy";
import { cancelPaidEsim, gateNewEsimSale, placePaidEsim, type PlacementOrder } from "@/lib/esim/supplier-place";

const GB = 1024 ** 3;

const packages: SupplierPackage[] = [
  {
    packageCode: "cn-5",
    name: "China 5GB 30Days (nonhkip)",
    price: 35200,
    volume: 5 * GB,
    duration: 30,
    durationUnit: "DAY",
    type: "BASE",
  },
  {
    packageCode: "cn-10",
    name: "China 10GB 30Days (nonhkip)",
    price: 67800,
    volume: 10 * GB,
    duration: 30,
    durationUnit: "DAY",
    type: "BASE",
  },
];

function order(overrides: Partial<PlacementOrder> = {}): PlacementOrder {
  return {
    paymentId: "pay_123",
    productId: "cn-5gb",
    priceKrw: 19900,
    status: "AWAITING_QR",
    qrText: "",
    supplierOrderNo: "",
    supplierIccid: "",
    supplierAttempts: 0,
    supplierError: "",
    ...overrides,
  };
}

function profile(overrides: Partial<SupplierProfile> = {}): SupplierProfile {
  return {
    orderNo: "B1",
    transactionId: "pay_123",
    iccid: "8901",
    ac: "LPA:1$example",
    esimStatus: "GOT_RESOURCE",
    smdpStatus: "RELEASED",
    ...overrides,
  };
}

function client(overrides: Partial<SupplierClient> = {}): SupplierClient {
  return {
    balanceUsd: vi.fn(async () => 46.48),
    packages: vi.fn(async () => packages),
    order: vi.fn(async () => ({ orderNo: "B1" })),
    query: vi.fn(async () => profile()),
    cancel: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("gateNewEsimSale", () => {
  it("allows the pinned plans while the deposit covers them", async () => {
    await expect(gateNewEsimSale("cn-5gb", 19900, client())).resolves.toEqual({ ok: true });
    await expect(gateNewEsimSale("cn-10gb", 29900, client())).resolves.toEqual({ ok: true });
  });

  it("stops every new data sale when the balance is below one 5GB plan", async () => {
    const result = await gateNewEsimSale("cn-10gb", 29900, client({ balanceUsd: async () => 3 }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("balance");
    }
  });

  it("stops only the plan that the balance cannot cover", async () => {
    const api = client({ balanceUsd: async () => 4 });
    await expect(gateNewEsimSale("cn-5gb", 19900, api)).resolves.toEqual({ ok: true });
    const blocked = await gateNewEsimSale("cn-10gb", 29900, api);
    expect(blocked.ok).toBe(false);
  });

  it("stops a new sale when the wholesale cost reaches the selling price", async () => {
    const result = await gateNewEsimSale("cn-5gb", 4000, client());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("margin");
    }
  });

  it("stops when the pinned package is missing or ambiguous", async () => {
    const result = await gateNewEsimSale("cn-5gb", 19900, client({ packages: async () => [] }));
    expect(result.ok).toBe(false);
  });
});

describe("placePaidEsim", () => {
  it("stores the activation code and does not order again for the same payment", async () => {
    const api = client({
      query: vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(profile())
        .mockResolvedValueOnce(profile()),
    });
    const patches: Array<Partial<PlacementOrder>> = [];
    const current = order();
    await placePaidEsim(
      current,
      api,
      (patch) => {
        Object.assign(current, patch);
        patches.push(patch);
      },
      vi.fn()
    );
    expect(api.order).toHaveBeenCalledWith({ transactionId: "pay_123", packageCode: "cn-5", price: 35200 });
    expect(current.status).toBe("READY");
    expect(current.qrText).toBe("LPA:1$example");

    await placePaidEsim(current, api, (patch) => patches.push(patch), vi.fn());
    expect(api.order).toHaveBeenCalledTimes(1);
  });

  it("keeps the order preparing until the activation code exists", async () => {
    const api = client({
      query: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(profile({ ac: "" })),
    });
    const current = order();
    await placePaidEsim(current, api, (patch) => Object.assign(current, patch), vi.fn());
    expect(api.order).toHaveBeenCalledTimes(1);
    expect(current.status).toBe("AWAITING_QR");
    expect(current.qrText).toBe("");
    expect(current.supplierOrderNo).toBe("B1");
  });

  it("does not buy at a changed price and leaves the order for a manual code", async () => {
    const api = client({
      query: vi.fn(async () => null),
      order: vi.fn(async () => {
        throw new SupplierRequestError("200005", "price");
      }),
    });
    const current = order();
    await placePaidEsim(current, api, (patch) => Object.assign(current, patch), vi.fn());
    expect(current.supplierAttempts).toBe(3);
    expect(current.status).toBe("AWAITING_QR");
    await placePaidEsim(current, api, (patch) => Object.assign(current, patch), vi.fn());
    expect(api.order).toHaveBeenCalledTimes(1);
  });

  it("recovers the existing supplier order when the transaction id was already used", async () => {
    const api = client({
      query: vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(profile({ orderNo: "B9", transactionId: "pay_123" })),
      order: vi.fn(async () => {
        throw new SupplierRequestError("310402", "duplicate");
      }),
    });
    const current = order();
    await placePaidEsim(current, api, (patch) => Object.assign(current, patch), vi.fn());
    expect(current.supplierOrderNo).toBe("B9");
    expect(current.status).toBe("READY");
    expect(api.order).toHaveBeenCalledTimes(1);
  });

  it("stops after three balance failures", async () => {
    const api = client({ balanceUsd: async () => 1, query: async () => null });
    const current = order();
    const notify = vi.fn();
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await placePaidEsim(current, api, (patch) => Object.assign(current, patch), notify);
    }
    expect(api.order).not.toHaveBeenCalled();
    expect(current.supplierAttempts).toBe(3);
    expect(notify).toHaveBeenCalledTimes(3);
  });
});

describe("cancelPaidEsim", () => {
  it("cancels an unused profile and refuses an installed one", async () => {
    const unused = client();
    await expect(cancelPaidEsim(order({ supplierOrderNo: "B1" }), unused)).resolves.toBe("cancelled");
    expect(unused.cancel).toHaveBeenCalledWith("8901");

    const installed = client({
      query: async () => profile({ esimStatus: "IN_USE", smdpStatus: "ENABLED" }),
    });
    await expect(cancelPaidEsim(order({ supplierOrderNo: "B1" }), installed)).resolves.toBe("blocked");
    expect(installed.cancel).not.toHaveBeenCalled();
  });
});

describe("parseSupplierBody", () => {
  it("reads a successful object and a price error", () => {
    expect(parseSupplierBody({ success: true, errorCode: "0", obj: { orderNo: "B1" } })).toEqual({
      ok: true,
      obj: { orderNo: "B1" },
    });
    expect(parseSupplierBody({ success: false, errorCode: "200005", errorMsg: "price" })).toMatchObject({
      ok: false,
      code: "200005",
    });
  });
});
