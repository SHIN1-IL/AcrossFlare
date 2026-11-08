import { describe, expect, it } from "vitest";
import { networkCompareRows } from "@/lib/network/compare";

describe("network compare", () => {
  it("compares Standard and Hybrid from the catalog week and month plans", () => {
    expect(networkCompareRows()).toEqual([
      {
        id: "week",
        standard: { prices: { krw: 5900, usd: 5, cny: 29, jpy: 680 }, trafficGb: 20 },
        hybrid: { prices: { krw: 9900, usd: 8, cny: 49, jpy: 1100 }, trafficGb: 20 },
      },
      {
        id: "month",
        standard: { prices: { krw: 9900, usd: 8, cny: 49, jpy: 1100 }, trafficGb: 100 },
        hybrid: { prices: { krw: 19900, usd: 15, cny: 99, jpy: 2300 }, trafficGb: 100 },
      },
      {
        id: "year",
        standard: { prices: { krw: 99000, usd: 80, cny: 490, jpy: 11000 }, trafficGb: 1200 },
        hybrid: { prices: { krw: 199000, usd: 150, cny: 990, jpy: 23000 }, trafficGb: 1200 },
      },
    ]);
  });
});
