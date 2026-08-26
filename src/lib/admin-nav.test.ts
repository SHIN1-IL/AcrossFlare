import { describe, expect, it } from "vitest";
import { adminNavItems, adminTabMessageKey, firstAdminPath, productHasBackup } from "@/lib/admin-nav";
import { pricingServiceFromQuery } from "@/lib/marketing-services";

describe("admin-nav", () => {
  it("labels the public admin tabs", () => {
    expect(adminTabMessageKey("global")).toBe("tabGlobal");
    expect(adminTabMessageKey("workspace")).toBe("tabWorkspace");
    expect(adminTabMessageKey("marketing")).toBe("tabMarketing");
  });

  it("hides nav items the staff cannot open", () => {
    expect(adminNavItems("workspace", ["customers", "codes"]).map((item) => item.suffix)).toEqual([
      "customers",
      "codes",
    ]);
    expect(adminNavItems("global", ["codes", "provision"]).map((item) => item.suffix)).toEqual(["provision"]);
    expect(firstAdminPath("global", ["nodes"])).toBe("/admin/global/nodes");
    expect(firstAdminPath("global", [], true)).toBe("/admin/staff");
  });

  it("allows backup quota on standard/hybrid and workspace", () => {
    expect(productHasBackup("global")).toBe(true);
    expect(productHasBackup("workspace")).toBe(true);
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
