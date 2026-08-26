import { describe, expect, it } from "vitest";
import {
  adminServiceFromPlanId,
  canonicalAdminService,
  catalogPlanIds,
  isCatalogPlanId,
  isLegacyPlanId,
  productForAdminService,
} from "@/lib/admin-service";

describe("admin-service", () => {
  it("maps old admin URLs onto homepage services", () => {
    expect(canonicalAdminService("standard")).toBe("standard");
    expect(canonicalAdminService("hybrid")).toBe("hybrid");
    expect(canonicalAdminService("workspace")).toBe("workspace");
    expect(canonicalAdminService("global")).toBe("standard");
    expect(canonicalAdminService("marketing")).toBe("workspace");
    expect(canonicalAdminService("nope")).toBe(null);
  });

  it("keeps Standard and Hybrid on the shared global product", () => {
    expect(productForAdminService("standard")).toBe("global");
    expect(productForAdminService("hybrid")).toBe("global");
    expect(productForAdminService("workspace")).toBe("workspace");
  });

  it("groups leftover SKUs without mixing Hybrid into Standard", () => {
    expect(adminServiceFromPlanId("global-lite")).toBe("standard");
    expect(adminServiceFromPlanId("global-standard")).toBe("standard");
    expect(adminServiceFromPlanId("global-pro")).toBe("hybrid");
    expect(adminServiceFromPlanId("hybrid-year")).toBe("hybrid");
    expect(adminServiceFromPlanId("workspace-c")).toBe("workspace");
    expect(adminServiceFromPlanId("marketing-lite")).toBe("standard");
    expect(isCatalogPlanId("global-lite")).toBe(true);
    expect(isLegacyPlanId("global-pro")).toBe(true);
    expect(catalogPlanIds("standard")).toEqual(["global-week", "global-lite", "global-year"]);
  });
});
