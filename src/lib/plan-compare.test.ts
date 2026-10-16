import { describe, expect, it } from "vitest";
import { planCompareExtremes, planCompareRows } from "@/lib/plan-compare";
import { getPlanById } from "@/lib/plans";

describe("planCompareRows", () => {
  it("prices a year plan by the panel total, not the monthly homepage figure", () => {
    const year = getPlanById("global-year")!;
    const week = getPlanById("global-week")!;
    const rows = planCompareRows([week, year]);
    const yearRow = rows.find((row) => row.id === "global-year");
    const weekRow = rows.find((row) => row.id === "global-week");

    expect(weekRow).toMatchObject({ days: 7, trafficGb: 20, monthlyGb: null, krwPerGb: 295 });
    expect(yearRow).toMatchObject({ days: 360, trafficGb: 1200, monthlyGb: 100 });
    expect(yearRow?.krwPerGb).toBe(Math.round(year.prices.krw / 1200));
  });

  it("names the dearest and cheapest finite plans", () => {
    const rows = planCompareRows([getPlanById("global-week")!, getPlanById("global-lite")!, getPlanById("global-year")!]);
    expect(planCompareExtremes(rows)).toEqual({
      cheapestId: "global-year",
      dearestId: "global-week",
    });
  });
});
