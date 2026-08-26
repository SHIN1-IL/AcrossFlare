import { describe, expect, it } from "vitest";
import { publicServiceFromPlanId, publicServiceHref } from "@/lib/public-service";

describe("public-service", () => {
  it("maps catalog plan ids to homepage service names", () => {
    expect(publicServiceFromPlanId("global-lite")).toBe("standard");
    expect(publicServiceFromPlanId("global-week")).toBe("standard");
    expect(publicServiceFromPlanId("hybrid-lite")).toBe("hybrid");
    expect(publicServiceFromPlanId("workspace-a")).toBe("workspace");
    expect(publicServiceFromPlanId("marketing-standard")).toBe("marketing");
    expect(publicServiceFromPlanId(undefined)).toBe("standard");
  });

  it("sends unpaid users to the public service page, not marketing checkout", () => {
    expect(publicServiceHref("standard")).toBe("/standard");
    expect(publicServiceHref("hybrid")).toBe("/hybrid");
    expect(publicServiceHref("marketing")).toBe("/standard");
  });
});
