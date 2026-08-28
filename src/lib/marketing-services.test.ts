import { describe, expect, it } from "vitest";
import { HOME_SLIDE_PLAN_IDS, HOME_SLIDE_PRICES } from "@/lib/marketing-services";
import { getPlanById } from "@/lib/plans";

describe("home slides", () => {
  it("binds homepage cards to catalog plans with fixed prices", () => {
    expect(HOME_SLIDE_PLAN_IDS).toEqual(["global-lite", "global-pro"]);
    for (const id of HOME_SLIDE_PLAN_IDS) {
      expect(getPlanById(id)?.id).toBe(id);
      expect(HOME_SLIDE_PRICES[id]?.krw).toBeGreaterThan(0);
    }
  });
});
