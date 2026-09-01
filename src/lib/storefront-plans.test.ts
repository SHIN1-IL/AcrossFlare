import { describe, expect, it } from "vitest";
import { getPlanById, planTrafficQuota } from "@/lib/plans";
import { loadStorefrontPlans } from "@/lib/storefront-plans";

describe("loadStorefrontPlans", () => {
  it("falls back to catalog when the database is unavailable", async () => {
    const plans = await loadStorefrontPlans(["hybrid-lite"], "global");
    expect(plans).toHaveLength(1);
    expect(plans[0]?.id).toBe("hybrid-lite");
    expect(planTrafficQuota(plans[0]!)).toEqual({ cadence: "total", gb: 100 });
    expect(getPlanById("hybrid-lite")?.prices.krw).toBe(plans[0]?.prices.krw);
  });
});
