import { describe, expect, it } from "vitest";
import { esimCompareSets, esimDataOffers } from "@/lib/esim/compare";

describe("esim compare prices", () => {
  it("keeps the China data prices on the same currency bands as the connection plans", () => {
    expect(esimDataOffers().map((offer) => offer.prices)).toEqual([
      { krw: 19900, usd: 15, cny: 99, jpy: 2300 },
      { krw: 29900, usd: 22, cny: 149, jpy: 3400 },
    ]);
  });

  it("adds that language's connection price to the data price", () => {
    const sets = Object.fromEntries(esimCompareSets().map((row) => [row.id, row.cells.map((cell) => cell.prices)]));

    expect(sets["global-week"]).toEqual([
      { krw: 25800, usd: 20, cny: 128, jpy: 2980 },
      { krw: 35800, usd: 27, cny: 178, jpy: 4080 },
    ]);
    expect(sets["global-lite"]).toEqual([
      { krw: 29800, usd: 23, cny: 148, jpy: 3400 },
      { krw: 39800, usd: 30, cny: 198, jpy: 4500 },
    ]);
    expect(sets["hybrid-week"]).toEqual([
      { krw: 29800, usd: 23, cny: 148, jpy: 3400 },
      { krw: 39800, usd: 30, cny: 198, jpy: 4500 },
    ]);
    expect(sets["hybrid-lite"]).toEqual([
      { krw: 39800, usd: 30, cny: 198, jpy: 4600 },
      { krw: 49800, usd: 37, cny: 248, jpy: 5700 },
    ]);
  });
});
