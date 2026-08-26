import { describe, expect, it } from "vitest";
import { signedInHomeHref, type PublicSession } from "@/lib/auth-types";

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
