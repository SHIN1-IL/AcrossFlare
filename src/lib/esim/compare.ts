import { DEFAULT_ESIM_PRODUCTS } from "@/lib/esim/catalog";
import { getPlanById, type PlanPrices } from "@/lib/plans";

const SET_PLANS = [
  { id: "global-week", tier: "standard", term: "week" },
  { id: "global-lite", tier: "standard", term: "month" },
  { id: "hybrid-week", tier: "hybrid", term: "week" },
  { id: "hybrid-lite", tier: "hybrid", term: "month" },
] as const;

export type EsimCompareTier = (typeof SET_PLANS)[number]["tier"];
export type EsimCompareTerm = (typeof SET_PLANS)[number]["term"];

export type EsimCompareOffer = {
  id: string;
  dataGb: number;
  days: number;
  prices: PlanPrices;
};

export type EsimCompareSet = {
  id: string;
  tier: EsimCompareTier;
  term: EsimCompareTerm;
  cells: Array<{ productId: string; dataGb: number; prices: PlanPrices }>;
};

export function esimDataOffers(): EsimCompareOffer[] {
  return DEFAULT_ESIM_PRODUCTS.map((product) => ({
    id: product.id,
    dataGb: product.dataGb,
    days: product.days,
    prices: {
      krw: product.priceKrw,
      usd: product.priceUsd,
      cny: product.priceCny,
      jpy: product.priceJpy,
    },
  }));
}

export function esimCompareSets(): EsimCompareSet[] {
  const offers = esimDataOffers();
  return SET_PLANS.map((row) => {
    const plan = getPlanById(row.id);
    if (!plan) {
      throw new Error(`Missing connection plan ${row.id}`);
    }
    return {
      id: row.id,
      tier: row.tier,
      term: row.term,
      cells: offers.map((offer) => ({
        productId: offer.id,
        dataGb: offer.dataGb,
        prices: addPrices(plan.prices, offer.prices),
      })),
    };
  });
}

function addPrices(connection: PlanPrices, data: PlanPrices): PlanPrices {
  return {
    krw: connection.krw + data.krw,
    usd: connection.usd + data.usd,
    cny: connection.cny + data.cny,
    jpy: connection.jpy + data.jpy,
  };
}
