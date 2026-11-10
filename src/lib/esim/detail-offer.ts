import { planTerm, type PlanPrices } from "@/lib/plans";

export type AddonData = {
  id: string;
  days: number;
  prices: PlanPrices;
};

export type AddonChoice = {
  networkOn: boolean;
  dataOn: boolean;
  data: AddonData | null;
};

export type CardOffer = {
  prices: PlanPrices | null;
  includeNetwork: boolean;
  includeData: boolean;
  breakdown: { network: PlanPrices; data: PlanPrices } | null;
  checkout: { product: "global"; plan?: string; data?: string } | null;
};

/** Connection and China data stay separate products. A card price is their sum for that term. */
export function detailCardOffer(plan: { id: string; prices: PlanPrices }, choice: AddonChoice): CardOffer {
  const year = planTerm(plan.id) === "year";
  const data = choice.dataOn && !year ? choice.data : null;
  const includeNetwork = choice.networkOn;
  const includeData = Boolean(data);

  if (!includeNetwork && !includeData) {
    return emptyOffer();
  }

  if (includeNetwork && data) {
    return {
      prices: addPrices(plan.prices, data.prices),
      includeNetwork: true,
      includeData: true,
      breakdown: { network: plan.prices, data: data.prices },
      checkout: { product: "global", plan: plan.id, data: data.id },
    };
  }

  if (data) {
    return {
      prices: data.prices,
      includeNetwork: false,
      includeData: true,
      breakdown: null,
      checkout: { product: "global", data: data.id },
    };
  }

  return {
    prices: plan.prices,
    includeNetwork: true,
    includeData: false,
    breakdown: null,
    checkout: { product: "global", plan: plan.id },
  };
}

function emptyOffer(): CardOffer {
  return {
    prices: null,
    includeNetwork: false,
    includeData: false,
    breakdown: null,
    checkout: null,
  };
}

function addPrices(connection: PlanPrices, data: PlanPrices): PlanPrices {
  return {
    krw: connection.krw + data.krw,
    usd: connection.usd + data.usd,
    cny: connection.cny + data.cny,
    jpy: connection.jpy + data.jpy,
  };
}
