import { describe, expect, it } from "vitest";
import { customerOnNodeWhere, customerSubscriptionWhere, isDemoSubscription } from "@/lib/subscription-scope";

describe("customer subscription scope", () => {
  it("drops admin node checks from customer lists and seat counts", () => {
    expect(customerSubscriptionWhere).toEqual({ probeNodeId: null, probeGroupId: null });
    expect(customerOnNodeWhere("node-1")).toEqual({
      probeNodeId: null,
      probeGroupId: null,
      nodes: { some: { id: "node-1" } },
    });
  });

  it("treats seeded demos as tests and paid rows as customers", () => {
    expect(isDemoSubscription("seed_g_8ci81y24ut")).toBe(true);
    expect(isDemoSubscription("sub1")).toBe(false);
  });
});
