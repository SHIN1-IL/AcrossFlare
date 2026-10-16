import { describe, expect, it } from "vitest";
import { Product } from "@prisma/client";
import {
  POOL_GLOBAL_HYBRID,
  POOL_GLOBAL_STANDARD,
  POOL_MARKETING_DEFAULT,
  poolIdForNodeCodes,
} from "@/lib/provision/capacity";

describe("poolIdForNodeCodes", () => {
  it("maps standard LA(B) plans to global-standard", () => {
    expect(poolIdForNodeCodes(Product.GLOBAL, ["LA(B)"])).toBe(POOL_GLOBAL_STANDARD);
  });

  it("maps hybrid Tokyo+LA(A) plans to global-hybrid", () => {
    expect(poolIdForNodeCodes(Product.GLOBAL, ["Tokyo", "LA(A)"])).toBe(POOL_GLOBAL_HYBRID);
  });

  it("maps marketing to marketing-default", () => {
    expect(poolIdForNodeCodes(Product.MARKETING, ["US-East"])).toBe(POOL_MARKETING_DEFAULT);
  });

  it("returns null for workspace", () => {
    expect(poolIdForNodeCodes(Product.WORKSPACE, ["Tokyo", "LA(A)"])).toBeNull();
  });
});
