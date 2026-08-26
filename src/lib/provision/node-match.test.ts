import { describe, expect, it } from "vitest";
import { nodeNameMatchesCode } from "@/lib/provision/node-match";

describe("nodeNameMatchesCode", () => {
  it("keeps Standard LA(B) and Hybrid LA(A) apart", () => {
    expect(nodeNameMatchesCode("LA(B)-Bandwagon", "LA(B)")).toBe(true);
    expect(nodeNameMatchesCode("LA(A)-Bandwagon", "LA(A)")).toBe(true);
    expect(nodeNameMatchesCode("LA(B)-Bandwagon", "LA(A)")).toBe(false);
    expect(nodeNameMatchesCode("LA(A)-Bandwagon", "LA(B)")).toBe(false);
  });

  it("matches Tokyo by name", () => {
    expect(nodeNameMatchesCode("Tokyo-Bandwagon", "Tokyo")).toBe(true);
    expect(nodeNameMatchesCode("LA(A)-Bandwagon", "Tokyo")).toBe(false);
  });

  it("treats a bare LA tag as matching both LA grades", () => {
    expect(nodeNameMatchesCode("LA(B)-Bandwagon", "LA")).toBe(true);
    expect(nodeNameMatchesCode("LA(A)-Bandwagon", "LA")).toBe(true);
  });
});
