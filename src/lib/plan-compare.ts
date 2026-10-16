import { planPeriodMs, planTrafficQuota, type Plan } from "@/lib/plans";

export type PlanCompareRow = {
  id: string;
  days: number;
  trafficGb: number | null;
  monthlyGb: number | null;
  krwPerGb: number | null;
};

export function planCompareRows(
  plans: Array<Pick<Plan, "id" | "trafficGb" | "prices">>
): PlanCompareRow[] {
  return plans.map((plan) => {
    const quota = planTrafficQuota(plan);
    const trafficGb = plan.trafficGb;
    return {
      id: plan.id,
      days: planPeriodMs(plan.id) / (24 * 60 * 60 * 1000),
      trafficGb,
      monthlyGb: quota?.cadence === "month" ? quota.gb : null,
      krwPerGb: trafficGb != null && trafficGb > 0 ? Math.round(plan.prices.krw / trafficGb) : null,
    };
  });
}

export function planCompareExtremes(rows: PlanCompareRow[]) {
  const priced = rows.filter((row): row is PlanCompareRow & { krwPerGb: number } => row.krwPerGb != null);
  if (!priced.length) {
    return { cheapestId: null, dearestId: null };
  }
  const sorted = [...priced].sort((left, right) => left.krwPerGb - right.krwPerGb || left.days - right.days);
  return {
    cheapestId: sorted[0]?.id ?? null,
    dearestId: sorted[sorted.length - 1]?.id ?? null,
  };
}
