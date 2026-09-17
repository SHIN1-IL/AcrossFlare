import { afterEach, describe, expect, it } from "vitest";
import {
  REVIEW_USER_EMAIL,
  canStartPublicCheckout,
  isReviewUserEmail,
  reviewUserEmail,
  reviewUserPassword,
} from "@/lib/review-user";

describe("review-user", () => {
  afterEach(() => {
    delete process.env.REVIEW_USER_EMAIL;
    delete process.env.REVIEW_USER_PASSWORD;
  });

  it("still identifies the PG review account", () => {
    expect(isReviewUserEmail(REVIEW_USER_EMAIL)).toBe(true);
    expect(isReviewUserEmail("Shin@Acrosstool.com")).toBe(true);
  });

  it("lets any signed-in email start public checkout", () => {
    expect(canStartPublicCheckout(REVIEW_USER_EMAIL)).toBe(true);
    expect(canStartPublicCheckout("visitor@example.com")).toBe(true);
    expect(canStartPublicCheckout("global-user@acrossflare.com")).toBe(true);
    expect(canStartPublicCheckout(null)).toBe(false);
    expect(canStartPublicCheckout("")).toBe(false);
  });

  it("reads review credentials from env", () => {
    process.env.REVIEW_USER_EMAIL = "review@example.com";
    process.env.REVIEW_USER_PASSWORD = "env-pass-1";
    expect(reviewUserEmail()).toBe("review@example.com");
    expect(reviewUserPassword()).toBe("env-pass-1");
    expect(canStartPublicCheckout("review@example.com")).toBe(true);
  });
});
