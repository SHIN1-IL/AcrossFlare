import { describe, expect, it } from "vitest";
import { detailCardOffer, type AddonData } from "@/lib/esim/detail-offer";
import { getPlanById } from "@/lib/plans";

const data5: AddonData = {
  id: "cn-5gb",
  days: 30,
  prices: { krw: 19900, usd: 15, cny: 99, jpy: 2300 },
};
const data10: AddonData = {
  id: "cn-10gb",
  days: 30,
  prices: { krw: 29900, usd: 22, cny: 149, jpy: 3400 },
};

function plan(id: string) {
  const found = getPlanById(id);
  if (!found) {
    throw new Error(id);
  }
  return found;
}

describe("detailCardOffer", () => {
  it("starts from the connection price when data is off", () => {
    expect(detailCardOffer(plan("global-week"), { networkOn: true, dataOn: false, data: data5 })).toMatchObject({
      prices: plan("global-week").prices,
      includeData: false,
      checkout: { product: "global", plan: "global-week" },
    });
  });

  it("adds the selected data price on week and month cards", () => {
    expect(detailCardOffer(plan("global-week"), { networkOn: true, dataOn: true, data: data5 }).prices).toEqual({
      krw: 25800,
      usd: 20,
      cny: 128,
      jpy: 2980,
    });
    expect(detailCardOffer(plan("global-lite"), { networkOn: true, dataOn: true, data: data10 }).prices).toEqual({
      krw: 39800,
      usd: 30,
      cny: 198,
      jpy: 4500,
    });
    expect(detailCardOffer(plan("hybrid-week"), { networkOn: true, dataOn: true, data: data5 }).prices).toEqual({
      krw: 29800,
      usd: 23,
      cny: 148,
      jpy: 3400,
    });
    expect(detailCardOffer(plan("hybrid-lite"), { networkOn: true, dataOn: true, data: data10 }).prices).toEqual({
      krw: 49800,
      usd: 37,
      cny: 248,
      jpy: 5700,
    });
  });

  it("keeps a year card on the connection price", () => {
    const offer = detailCardOffer(plan("global-year"), { networkOn: true, dataOn: true, data: data5 });
    expect(offer.prices).toEqual(plan("global-year").prices);
    expect(offer.checkout).toEqual({ product: "global", plan: "global-year" });
    expect(offer.includeData).toBe(false);
  });

  it("sells data alone when the connection is off, and closes the year card", () => {
    expect(detailCardOffer(plan("hybrid-lite"), { networkOn: false, dataOn: true, data: data5 })).toMatchObject({
      prices: data5.prices,
      includeNetwork: false,
      checkout: { product: "global", data: "cn-5gb" },
    });
    expect(detailCardOffer(plan("hybrid-year"), { networkOn: false, dataOn: true, data: data5 }).checkout).toBeNull();
  });

  it("has nothing to sell when both are off", () => {
    expect(detailCardOffer(plan("global-lite"), { networkOn: false, dataOn: false, data: data5 }).prices).toBeNull();
  });
});
