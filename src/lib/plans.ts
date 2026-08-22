export type ProductId = "global" | "marketing";

export type PlanPrices = {
  krw: number;
  usd: number;
  cny: number;
  jpy: number;
};

export type Plan = {
  id: string;
  product: ProductId;
  name: string;
  prices: PlanPrices;
  trafficGb: number | null;
  backupGb: number | null;
  nodes: string[];
  featured?: boolean;
};

export const plans: Plan[] = [
  {
    id: "global-lite",
    product: "global",
    name: "Lite",
    prices: { krw: 19900, usd: 15, cny: 99, jpy: 2300 },
    trafficGb: 80,
    backupGb: 1,
    nodes: ["SG"],
  },
  {
    id: "global-standard",
    product: "global",
    name: "Standard",
    prices: { krw: 39900, usd: 29, cny: 199, jpy: 4500 },
    trafficGb: 150,
    backupGb: 1,
    nodes: ["SG", "JP"],
    featured: true,
  },
  {
    id: "global-pro",
    product: "global",
    name: "Pro",
    prices: { krw: 69900, usd: 49, cny: 349, jpy: 7600 },
    trafficGb: null,
    backupGb: 1,
    nodes: ["SG", "JP", "US"],
  },
  {
    id: "marketing-lite",
    product: "marketing",
    name: "Lite",
    prices: { krw: 29900, usd: 22, cny: 149, jpy: 3400 },
    trafficGb: 50,
    backupGb: null,
    nodes: ["US-East"],
  },
  {
    id: "marketing-standard",
    product: "marketing",
    name: "Standard",
    prices: { krw: 59900, usd: 44, cny: 299, jpy: 6800 },
    trafficGb: 200,
    backupGb: null,
    nodes: ["US-East", "US-West"],
    featured: true,
  },
  {
    id: "marketing-pro",
    product: "marketing",
    name: "Pro",
    prices: { krw: 99900, usd: 74, cny: 499, jpy: 11400 },
    trafficGb: null,
    backupGb: null,
    nodes: ["US-East", "US-West", "EU"],
  },
];

export function getPlansByProduct(product: ProductId) {
  return plans.filter((plan) => plan.product === product);
}

export function getPlanById(id: string | null | undefined) {
  if (!id) {
    return null;
  }

  return plans.find((plan) => plan.id === id) ?? null;
}

export function isProductId(value: string | null | undefined): value is ProductId {
  return value === "global" || value === "marketing";
}
