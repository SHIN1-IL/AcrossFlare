import { describe, expect, it } from "vitest";
import {
  getPlanById,
  isPublicCheckoutProduct,
  planPricePeriodKey,
  planTrafficQuota,
  plans,
  publicPlanFrom,
  resolveMarketingPlans,
} from "@/lib/plans";

describe("plan node codes", () => {
  it("does not list Singapore", () => {
    for (const plan of plans) {
      expect(plan.nodes).not.toContain("SG");
    }
  });

  it("binds Standard to LA(B) and Hybrid/Workspace to Tokyo + LA(A)", () => {
    expect(getPlanById("global-week")!.nodes).toEqual(["LA(B)"]);
    expect(getPlanById("global-lite")!.nodes).toEqual(["LA(B)"]);
    expect(getPlanById("global-year")!.nodes).toEqual(["LA(B)"]);
    expect(getPlanById("hybrid-lite")!.nodes).toEqual(["Tokyo", "LA(A)"]);
    expect(getPlanById("workspace-a")!.nodes).toEqual(["Tokyo", "LA(A)"]);
  });
});

describe("planTrafficQuota", () => {
  it("shows yearly catalog totals as monthly amounts", () => {
    expect(planTrafficQuota(getPlanById("global-year")!)).toEqual({ cadence: "month", gb: 100 });
    expect(planTrafficQuota(getPlanById("hybrid-year")!)).toEqual({ cadence: "month", gb: 100 });
  });

  it("keeps week and month plans as a period total", () => {
    expect(planTrafficQuota(getPlanById("global-week")!)).toEqual({ cadence: "total", gb: 20 });
    expect(planTrafficQuota(getPlanById("global-lite")!)).toEqual({ cadence: "total", gb: 100 });
    expect(planTrafficQuota(getPlanById("workspace-a")!)).toEqual({ cadence: "total", gb: 100 });
    expect(planTrafficQuota(getPlanById("workspace-b")!)).toEqual({ cadence: "total", gb: 200 });
    expect(planTrafficQuota(getPlanById("workspace-c")!)).toEqual({ cadence: "total", gb: 1000 });
  });

  it("uses live traffic and prices when admin quota differs from catalog", () => {
    const catalog = getPlanById("global-lite")!;
    const live = { ...catalog, trafficGb: 80 };
    expect(planTrafficQuota(publicPlanFrom(catalog, live)!)).toEqual({ cadence: "total", gb: 80 });

    const year = getPlanById("global-year")!;
    expect(planTrafficQuota(publicPlanFrom(year, { ...year, trafficGb: 960 })!)).toEqual({
      cadence: "month",
      gb: 80,
    });
  });

  it("falls back to catalog when live plan is missing", () => {
    const catalog = getPlanById("hybrid-lite")!;
    expect(planTrafficQuota(publicPlanFrom(catalog, undefined)!)).toEqual({ cadence: "total", gb: 100 });
  });
});

describe("resolveMarketingPlans", () => {
  it("maps the hybrid home slide to hybrid-lite quota", () => {
    const live = getPlanById("hybrid-lite")!;
    const [slide] = resolveMarketingPlans(["global-pro"], [live]);
    expect(slide?.id).toBe("global-pro");
    expect(planTrafficQuota(slide!)).toEqual({ cadence: "total", gb: 100 });
    expect(slide?.prices.krw).toBe(live.prices.krw);
  });

  it("treats unlimited traffic as no quota", () => {
    expect(planTrafficQuota(getPlanById("global-pro")!)).toBeNull();
  });
});

describe("planPricePeriodKey", () => {
  it("matches the service-page period labels", () => {
    expect(planPricePeriodKey("global-week")).toBe("periodWeek");
    expect(planPricePeriodKey("hybrid-week", "hybrid")).toBe("period1Week");
    expect(planPricePeriodKey("global-lite")).toBe("periodMonth");
    expect(planPricePeriodKey("hybrid-lite", "hybrid")).toBe("periodMonth");
    expect(planPricePeriodKey("global-year")).toBe("periodYear");
    expect(planPricePeriodKey("workspace-a")).toBe("periodMonth");
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
