import { describe, expect, it } from "vitest";
import { afterLoginHref, loginRedirectHref, signedInHomeHref, type PublicSession } from "@/lib/auth-types";

function session(role: PublicSession["role"]): PublicSession {
  return { email: "ops@acrossflare.com", role, permissions: [] };
}

describe("signedInHomeHref", () => {
  it("sends staff and owners to the admin panel", () => {
    expect(signedInHomeHref(session("ADMIN"))).toBe("/admin");
    expect(signedInHomeHref(session("OWNER"))).toBe("/admin");
    expect(signedInHomeHref(session("STAFF"))).toBe("/admin");
  });

  it("sends customers to the product console", () => {
    expect(signedInHomeHref(session("USER"))).toBe("/app");
    expect(signedInHomeHref(null)).toBe("/app");
  });
});

describe("afterLoginHref", () => {
  it("sends staff and owners to the admin panel", () => {
    expect(afterLoginHref(session("ADMIN"))).toBe("/admin");
    expect(afterLoginHref(session("OWNER"))).toBe("/admin");
    expect(afterLoginHref(session("STAFF"))).toBe("/admin");
  });

  it("sends email customers to the console", () => {
    expect(afterLoginHref(session("USER"))).toBe("/app");
    expect(afterLoginHref(null)).toBe("/app");
  });
});

describe("loginRedirectHref", () => {
  it("opens the console for email customers", () => {
    expect(loginRedirectHref(session("USER"), "/app")).toBe("/app");
    expect(loginRedirectHref(session("USER"), "/app/global")).toBe("/app/global");
    expect(loginRedirectHref(session("USER"), "/dashboard")).toBe("/dashboard");
    expect(loginRedirectHref(session("USER"), null)).toBe("/app");
    expect(loginRedirectHref(session("USER"), "/")).toBe("/app");
    expect(loginRedirectHref(session("USER"), "/en/app")).toBe("/app");
  });

  it("still returns customers to checkout", () => {
    expect(loginRedirectHref(session("USER"), "/checkout?product=global&plan=global-lite")).toBe(
      "/checkout?product=global&plan=global-lite"
    );
    expect(loginRedirectHref(session("USER"), "/support")).toBe("/support");
    expect(loginRedirectHref(session("USER"), "/standard")).toBe("/standard");
    expect(loginRedirectHref(session("USER"), "/hybrid")).toBe("/hybrid");
  });

  it("returns staff to admin, not the customer console", () => {
    expect(loginRedirectHref(session("ADMIN"), "/admin/standard/customers")).toBe("/admin/standard/customers");
    expect(loginRedirectHref(session("OWNER"), "/app")).toBe("/admin");
    expect(loginRedirectHref(session("STAFF"), null)).toBe("/admin");
    expect(loginRedirectHref(session("USER"), "/en")).toBe("/app");
    expect(loginRedirectHref(session("USER"), "/en/checkout?product=global&plan=global-lite")).toBe(
      "/checkout?product=global&plan=global-lite"
    );
    expect(loginRedirectHref(session("ADMIN"), "/en/admin/standard")).toBe("/admin/standard");
  });
});
