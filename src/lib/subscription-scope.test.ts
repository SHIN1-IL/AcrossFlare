import { describe, expect, it } from "vitest";
import { customerOnNodeWhere, customerSubscriptionWhere } from "@/lib/subscription-scope";

describe("customer subscription scope", () => {
  it("drops admin node checks from customer lists and seat counts", () => {
    expect(customerSubscriptionWhere).toEqual({ probeNodeId: null, probeGroupId: null });
    expect(customerOnNodeWhere("node-1")).toEqual({
      probeNodeId: null,
      probeGroupId: null,
      nodes: { some: { id: "node-1" } },
    });
  });
});
