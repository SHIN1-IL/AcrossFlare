import { describe, expect, it } from "vitest";
import {
  getPlanById,
  isPublicCheckoutProduct,
  planTrafficQuota,
  publicPlanFrom,
} from "@/lib/plans";

describe("planTrafficQuota", () => {
  it("shows yearly catalog totals as monthly amounts", () => {
    expect(planTrafficQuota(getPlanById("workspace-a")!)).toEqual({ cadence: "month", gb: 100 });
    expect(planTrafficQuota(getPlanById("workspace-b")!)).toEqual({ cadence: "month", gb: 200 });
    expect(planTrafficQuota(getPlanById("workspace-c")!)).toEqual({ cadence: "month", gb: 1000 });
    expect(planTrafficQuota(getPlanById("global-year")!)).toEqual({ cadence: "month", gb: 100 });
    expect(planTrafficQuota(getPlanById("hybrid-year")!)).toEqual({ cadence: "month", gb: 100 });
  });

  it("keeps week and month plans as a period total", () => {
    expect(planTrafficQuota(getPlanById("global-week")!)).toEqual({ cadence: "total", gb: 20 });
    expect(planTrafficQuota(getPlanById("global-lite")!)).toEqual({ cadence: "total", gb: 100 });
  });

  it("uses catalog traffic on the storefront even when live quota differs", () => {
    const catalog = getPlanById("global-lite")!;
    const live = { ...catalog, trafficGb: 80 };
    expect(planTrafficQuota(publicPlanFrom(catalog, live)!)).toEqual({ cadence: "total", gb: 100 });

    const year = getPlanById("global-year")!;
    expect(planTrafficQuota(publicPlanFrom(year, { ...year, trafficGb: 80 })!)).toEqual({
      cadence: "month",
      gb: 100,
    });
  });

  it("treats unlimited traffic as no quota", () => {
    expect(planTrafficQuota(getPlanById("global-pro")!)).toBeNull();
  });
});

describe("isPublicCheckoutProduct", () => {
  it("allows Standard/Hybrid and Workspace, not Marketing IP", () => {
    expect(isPublicCheckoutProduct("global")).toBe(true);
    expect(isPublicCheckoutProduct("workspace")).toBe(true);
    expect(isPublicCheckoutProduct("marketing")).toBe(false);
    expect(isPublicCheckoutProduct("other")).toBe(false);
  });
});
