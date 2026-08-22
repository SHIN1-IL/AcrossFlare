import { describe, expect, it } from "vitest";
import {
  anySafeEqual,
  hmacSha256Hex,
  isFreshTimestamp,
  md5Hex,
  safeEqual,
} from "@/lib/payments/crypto";

describe("payments/crypto", () => {
  it("compares equal strings", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "ab")).toBe(false);
  });

  it("accepts any matching candidate", () => {
    expect(anySafeEqual("sig", ["nope", "sig"])).toBe(true);
    expect(anySafeEqual("sig", ["nope"])).toBe(false);
  });

  it("hashes hmac and md5", () => {
    expect(hmacSha256Hex("secret", "1.body")).toHaveLength(64);
    expect(md5Hex("uid=1")).toHaveLength(32);
  });

  it("accepts timestamps inside the window", () => {
    const now = 1_700_000_000;
    expect(isFreshTimestamp(now, 300, now)).toBe(true);
    expect(isFreshTimestamp(now - 301, 300, now)).toBe(false);
  });
});
