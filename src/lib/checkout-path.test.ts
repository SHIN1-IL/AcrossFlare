import { describe, expect, it } from "vitest";
import { checkoutReturnPath, signedInContinuePath } from "@/lib/checkout-path";
import type { PublicSession } from "@/lib/auth-types";

function session(role: PublicSession["role"] = "USER"): PublicSession {
  return { email: "a@b.c", role, permissions: [] };
}

describe("checkoutReturnPath", () => {
  it("keeps checkout query params for the login next URL", () => {
    expect(
      checkoutReturnPath({
        product: "global",
        plan: "global-lite",
        promoCode: "SAVE",
        paymentId: "pay_1",
        canceled: true,
      })
    ).toBe("/checkout?product=global&plan=global-lite&code=SAVE&paymentId=pay_1&canceled=1");
  });

  it("returns the bare checkout path when nothing is selected", () => {
    expect(checkoutReturnPath({})).toBe("/checkout");
  });
});

describe("signedInContinuePath", () => {
  it("prefers an explicit checkout product over next", () => {
    expect(
      signedInContinuePath(session(), {
        next: "/support",
        product: "global",
        plan: "global-lite",
      })
    ).toBe("/checkout?product=global&plan=global-lite");
  });

  it("uses next when the login URL already points at checkout", () => {
    expect(
      signedInContinuePath(session(), {
        next: "/checkout?product=global&plan=global-lite",
      })
    ).toBe("/checkout?product=global&plan=global-lite");
  });
});
