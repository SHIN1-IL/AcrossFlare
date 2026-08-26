import { describe, expect, it } from "vitest";
import {
  REVIEW_USER_EMAIL,
  canStartPublicCheckout,
  isReviewUserEmail,
} from "@/lib/review-user";

describe("review-user", () => {
  it("treats the PG review account as the only public checkout identity", () => {
    expect(isReviewUserEmail(REVIEW_USER_EMAIL)).toBe(true);
    expect(isReviewUserEmail("Shin@Acrosstool.com")).toBe(true);
    expect(canStartPublicCheckout(REVIEW_USER_EMAIL)).toBe(true);
  });

  it("keeps general visitor accounts off public checkout", () => {
    expect(isReviewUserEmail("visitor@example.com")).toBe(false);
    expect(canStartPublicCheckout("visitor@example.com")).toBe(false);
    expect(canStartPublicCheckout("global-user@acrossflare.com")).toBe(false);
    expect(canStartPublicCheckout(null)).toBe(false);
  });
});
