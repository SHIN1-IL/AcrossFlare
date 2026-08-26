export const PRODUCT_IDS = ["global", "marketing", "workspace"] as const;

export type ProductId = (typeof PRODUCT_IDS)[number];

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
    name: "Month",
    prices: { krw: 9900, usd: 8, cny: 49, jpy: 1100 },
    trafficGb: 100,
    backupGb: 1,
    nodes: ["LA(B)"],
  },
  {
    id: "global-week",
    product: "global",
    name: "Week",
    prices: { krw: 5900, usd: 5, cny: 29, jpy: 680 },
    trafficGb: 20,
    backupGb: 1,
    nodes: ["LA(B)"],
  },
  {
    id: "global-year",
    product: "global",
    name: "Year",
    prices: { krw: 99000, usd: 80, cny: 490, jpy: 11000 },
    trafficGb: 1200,
    backupGb: 1,
    nodes: ["LA(B)"],
  },
  {
    id: "global-standard",
    product: "global",
    name: "Standard",
    prices: { krw: 39900, usd: 29, cny: 199, jpy: 4500 },
    trafficGb: 150,
    backupGb: 1,
    nodes: ["LA(B)"],
    featured: true,
  },
  {
    id: "global-pro",
    product: "global",
    name: "Pro",
    prices: { krw: 69900, usd: 49, cny: 349, jpy: 7600 },
    trafficGb: null,
    backupGb: 1,
    nodes: ["Tokyo", "LA(A)"],
  },
  {
    id: "hybrid-week",
    product: "global",
    name: "Week",
    prices: { krw: 9900, usd: 8, cny: 49, jpy: 1100 },
    trafficGb: 20,
    backupGb: 1,
    nodes: ["Tokyo", "LA(A)"],
  },
  {
    id: "hybrid-lite",
    product: "global",
    name: "Month",
    prices: { krw: 19900, usd: 15, cny: 99, jpy: 2300 },
    trafficGb: 100,
    backupGb: 1,
    nodes: ["Tokyo", "LA(A)"],
  },
  {
    id: "hybrid-year",
    product: "global",
    name: "Year",
    prices: { krw: 199000, usd: 150, cny: 990, jpy: 23000 },
    trafficGb: 1200,
    backupGb: 1,
    nodes: ["Tokyo", "LA(A)"],
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
  {
    id: "workspace-a",
    product: "workspace",
    name: "A",
    prices: { krw: 1990000, usd: 1500, cny: 9900, jpy: 230000 },
    trafficGb: 1200,
    backupGb: 1,
    nodes: ["Tokyo", "LA(A)"],
  },
  {
    id: "workspace-b",
    product: "workspace",
    name: "B",
    prices: { krw: 1990000, usd: 1500, cny: 9900, jpy: 230000 },
    trafficGb: 2400,
    backupGb: 1,
    nodes: ["Tokyo", "LA(A)"],
  },
  {
    id: "workspace-c",
    product: "workspace",
    name: "C",
    prices: { krw: 1990000, usd: 1500, cny: 9900, jpy: 230000 },
    trafficGb: 12000,
    backupGb: 1,
    nodes: ["Tokyo", "LA(A)"],
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

export function publicPlanFrom(catalog: Plan | null | undefined, live: Plan | undefined): Plan | undefined {
  const pricedLive = live && planHasPrice(live) ? live : undefined;
  const plan = pricedLive ?? catalog ?? live;
  if (!plan) {
    return undefined;
  }
  if (!catalog) {
    return plan;
  }

  return { ...plan, trafficGb: catalog.trafficGb };
}

export function isProductId(value: string | null | undefined): value is ProductId {
  return PRODUCT_IDS.includes(value as ProductId);
}

export type PublicCheckoutProduct = "global" | "workspace";

export function isPublicCheckoutProduct(
  value: string | null | undefined
): value is PublicCheckoutProduct {
  return value === "global" || value === "workspace";
}

export function planHasPrice(plan: Plan) {
  return plan.prices.krw > 0 || plan.prices.usd > 0 || plan.prices.cny > 0 || plan.prices.jpy > 0;
}

export function isWeeklyPlan(planId: string) {
  return planTerm(planId) === "week";
}

export function isNonMonthlyPlan(planId: string) {
  return planTerm(planId) !== "month";
}

export type PlanTerm = "week" | "month" | "year";

export function planTerm(planId: string): PlanTerm {
  if (planId.endsWith("-week")) return "week";
  if (planId.endsWith("-year") || planId.startsWith("workspace-")) {
    return "year";
  }
  return "month";
}

export type PlanPricePeriodKey = "periodWeek" | "period1Week" | "periodMonth" | "periodYear";

export function planPricePeriodKey(
  planId: string,
  serviceId?: string
): PlanPricePeriodKey {
  const term = planTerm(planId);
  if (term === "week") {
    return serviceId === "hybrid" ? "period1Week" : "periodWeek";
  }
  if (term === "year") {
    return "periodYear";
  }
  return "periodMonth";
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
const YEAR_MS = 12 * MONTH_MS;

export function planPeriodMs(planId: string) {
  const term = planTerm(planId);
  if (term === "week") return WEEK_MS;
  if (term === "year") return YEAR_MS;
  return MONTH_MS;
}

export type PlanTrafficQuota = {
  cadence: "month" | "total";
  gb: number;
};

export function planTrafficQuota(plan: Pick<Plan, "id" | "trafficGb">): PlanTrafficQuota | null {
  if (plan.trafficGb == null) {
    return null;
  }

  if (planTerm(plan.id) === "year") {
    const monthly = plan.trafficGb / 12;
    const gb = Number.isInteger(monthly) ? monthly : Number(monthly.toFixed(1));
    return { cadence: "month", gb };
  }

  return { cadence: "total", gb: plan.trafficGb };
}
