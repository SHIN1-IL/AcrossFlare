import { getPlanById, type PlanPrices } from "@/lib/plans";

const ROWS = [
  { id: "week", standardId: "global-week", hybridId: "hybrid-week" },
  { id: "month", standardId: "global-lite", hybridId: "hybrid-lite" },
  { id: "year", standardId: "global-year", hybridId: "hybrid-year" },
] as const;

export type NetworkCompareTerm = (typeof ROWS)[number]["id"];

export type NetworkCompareSide = {
  prices: PlanPrices;
  trafficGb: number;
};

export type NetworkCompareRow = {
  id: NetworkCompareTerm;
  standard: NetworkCompareSide;
  hybrid: NetworkCompareSide;
};

export function networkCompareRows(): NetworkCompareRow[] {
  return ROWS.map((row) => ({
    id: row.id,
    standard: side(row.standardId),
    hybrid: side(row.hybridId),
  }));
}

function side(planId: string): NetworkCompareSide {
  const plan = getPlanById(planId);
  if (!plan || plan.trafficGb == null) {
    throw new Error(`Missing network plan ${planId}`);
  }
  return { prices: plan.prices, trafficGb: plan.trafficGb };
}
