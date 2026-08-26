import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_STAFF_PERMISSIONS,
  filterAdminState,
  hasPermission,
  isAdminRole,
  isOwnerEmail,
  isOwnerRole,
  ownerEmail,
  parseStaffPermissions,
  permissionsFor,
} from "@/lib/admin-permissions";

describe("admin-permissions", () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
  });

  it("treats OWNER and legacy ADMIN as full owners", () => {
    expect(isOwnerRole("OWNER")).toBe(true);
    expect(isOwnerRole("ADMIN")).toBe(true);
    expect(isOwnerRole("STAFF")).toBe(false);
    expect(isAdminRole("STAFF")).toBe(true);
    expect(isAdminRole("USER")).toBe(false);
  });

  it("gives owners every permission and staff only checked ones", () => {
    expect(permissionsFor("OWNER")).toEqual(["customers", "plans", "codes", "provision", "nodes"]);
    expect(permissionsFor("STAFF", ["customers", "codes", "plans", "hack"])).toEqual([
      "customers",
      "plans",
      "codes",
    ]);
    expect(hasPermission("STAFF", ["provision"], "nodes")).toBe(false);
    expect(DEFAULT_STAFF_PERMISSIONS).toContain("customers");
  });

  it("reads the owner email from env and ignores junk permission strings", () => {
    process.env.ADMIN_OWNER_EMAIL = "  acrosstool@gmail.com ";
    expect(ownerEmail()).toBe("acrosstool@gmail.com");
    expect(isOwnerEmail("Acrosstool@gmail.com")).toBe(true);
    expect(parseStaffPermissions(["nodes", "nodes", "nope", 1])).toEqual(["nodes"]);
  });

  it("strips admin state the staff cannot see", () => {
    const state = {
      plans: [1],
      nodes: [2],
      customers: [3],
      promoCodes: [4],
    };
    expect(filterAdminState(state, ["customers", "codes"])).toEqual({
      plans: [1],
      nodes: [],
      customers: [3],
      promoCodes: [4],
    });
  });
});
