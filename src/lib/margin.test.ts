import { describe, expect, it } from "vitest";
import {
  adjustmentApplies,
  buildMarginSnapshot,
  currentMonthKey,
  parseAdjustmentBody,
  parseCostUpdates,
  paymentToKrw,
  seoulMonthRange,
  shiftMonth,
} from "@/lib/margin";

const plan = { priceKrw: 19900, priceUsd: 15, priceCny: 99, priceJpy: 2300 };

describe("margin calendar", () => {
  it("uses the Seoul calendar month", () => {
    expect(currentMonthKey(new Date("2026-09-30T14:59:00.000Z"))).toBe("2026-09");
    expect(currentMonthKey(new Date("2026-09-30T15:00:00.000Z"))).toBe("2026-10");
  });

  it("bounds a month at Seoul midnight", () => {
    expect(seoulMonthRange("2026-10")).toEqual({
      start: new Date("2026-09-30T15:00:00.000Z"),
      end: new Date("2026-10-31T15:00:00.000Z"),
    });
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });
});

describe("paymentToKrw", () => {
  it("keeps won and converts other currencies with the plan ratio", () => {
    expect(paymentToKrw({ amount: 19900, currency: "KRW", plan })).toBe(19900);
    expect(paymentToKrw({ amount: 15, currency: "usd", plan })).toBe(19900);
    expect(paymentToKrw({ amount: 99, currency: "CNY", plan })).toBe(19900);
    expect(paymentToKrw({ amount: 10, currency: "EUR", plan })).toBe(0);
  });
});

describe("buildMarginSnapshot", () => {
  it("subtracts VPS cost from card payments plus cash and recurring friends", () => {
    const snapshot = buildMarginSnapshot({
      month: "2026-10",
      nodes: [
        {
          id: "tokyo",
          name: "Tokyo",
          provider: "bandwagon",
          monthlyCostKrw: 12000,
          createdAt: new Date("2026-08-01T00:00:00.000Z"),
        },
        {
          id: "future",
          name: "Future",
          provider: "",
          monthlyCostKrw: 90000,
          createdAt: new Date("2026-11-01T00:00:00.000Z"),
        },
      ],
      payments: [
        { amount: 19900, currency: "KRW", plan },
        { amount: 15, currency: "USD", plan },
      ],
      adjustments: [
        {
          id: "cash",
          label: "현금 김철수",
          amountKrw: 30000,
          note: "",
          recurring: false,
          month: "2026-10",
        },
        {
          id: "friend",
          label: "지인",
          amountKrw: 10000,
          note: "",
          recurring: true,
          month: "2026-09",
        },
        {
          id: "later",
          label: "다음달 현금",
          amountKrw: 50000,
          note: "",
          recurring: false,
          month: "2026-11",
        },
      ],
    });

    expect(snapshot.operatingCostKrw).toBe(12000);
    expect(snapshot.customerPaidKrw).toBe(39800);
    expect(snapshot.adjustmentKrw).toBe(40000);
    expect(snapshot.revenueKrw).toBe(79800);
    expect(snapshot.marginKrw).toBe(67800);
    expect(snapshot.nodes.map((node) => node.id)).toEqual(["tokyo"]);
    expect(snapshot.adjustments.map((entry) => entry.id)).toEqual(["cash", "friend"]);
    expect(adjustmentApplies({ month: "2026-10", recurring: true }, "2026-10")).toBe(true);
    expect(adjustmentApplies({ month: "2026-11", recurring: true }, "2026-10")).toBe(false);
  });
});

describe("margin parsers", () => {
  it("accepts cost edits and extra revenue rows", () => {
    expect(parseCostUpdates({ nodes: [{ id: "tokyo", monthlyCostKrw: "12,000" }] })).toEqual([
      { id: "tokyo", monthlyCostKrw: 12000 },
    ]);
    expect(parseCostUpdates({ nodes: [] })).toBeNull();
    expect(
      parseAdjustmentBody(
        { label: " 현금 ", amountKrw: 5000, note: "지인", recurring: true, month: "2026-10" },
        "2026-09"
      )
    ).toEqual({
      label: "현금",
      amountKrw: 5000,
      note: "지인",
      recurring: true,
      month: "2026-10",
    });
    expect(parseAdjustmentBody({ label: "", amountKrw: 5000 }, "2026-10")).toBeNull();
  });
});
