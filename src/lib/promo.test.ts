import { describe, expect, it } from "vitest";
import { normalizePromoCode } from "@/lib/promo";

describe("normalizePromoCode", () => {
  it("uppercases and strips junk", () => {
    expect(normalizePromoCode(" af-ab12 ")).toBe("AF-AB12");
    expect(normalizePromoCode("af_ab12")).toBe("AFAB12");
  });
});
