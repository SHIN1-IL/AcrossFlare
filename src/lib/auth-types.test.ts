import { describe, expect, it } from "vitest";
import { afterLoginHref, signedInHomeHref, type PublicSession } from "@/lib/auth-types";

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

  it("sends customers and the review account to the marketing home", () => {
    expect(afterLoginHref(session("USER"))).toBe("/");
    expect(afterLoginHref(null)).toBe("/");
  });
});
