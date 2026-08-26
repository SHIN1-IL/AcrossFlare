import { describe, expect, it } from "vitest";
import { adminNavItems, adminTabMessageKey, firstAdminPath, productHasBackup } from "@/lib/admin-nav";
import { pricingServiceFromQuery } from "@/lib/marketing-services";

describe("admin-nav", () => {
  it("labels the public admin tabs", () => {
    expect(adminTabMessageKey("standard")).toBe("tabStandard");
    expect(adminTabMessageKey("hybrid")).toBe("tabHybrid");
    expect(adminTabMessageKey("workspace")).toBe("tabWorkspace");
  });

  it("hides nav items the staff cannot open", () => {
    expect(adminNavItems("workspace", ["customers", "codes"]).map((item) => item.suffix)).toEqual([
      "customers",
      "codes",
    ]);
    expect(adminNavItems("standard", ["codes", "provision"]).map((item) => item.suffix)).toEqual(["provision"]);
    expect(firstAdminPath("hybrid", ["nodes"])).toBe("/admin/hybrid/nodes");
    expect(firstAdminPath("standard", [], true)).toBe("/admin/staff");
  });

  it("allows backup quota on standard/hybrid and workspace", () => {
    expect(productHasBackup("global")).toBe(true);
    expect(productHasBackup("workspace")).toBe(true);
    expect(productHasBackup("standard")).toBe(true);
    expect(productHasBackup("marketing")).toBe(false);
  });
});

describe("pricingServiceFromQuery", () => {
  it("maps public service names and old product query params", () => {
    expect(pricingServiceFromQuery("standard")).toBe("standard");
    expect(pricingServiceFromQuery("hybrid")).toBe("hybrid");
    expect(pricingServiceFromQuery("workspace")).toBe("workspace");
    expect(pricingServiceFromQuery("global")).toBe("standard");
    expect(pricingServiceFromQuery("marketing")).toBe("workspace");
    expect(pricingServiceFromQuery(undefined)).toBe("standard");
  });
});
