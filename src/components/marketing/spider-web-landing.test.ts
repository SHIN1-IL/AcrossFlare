import { describe, expect, it } from "vitest";
import { HERO_FREEZE_TIME, heroCaptionAt } from "@/components/marketing/spider-web-landing";

describe("hero captions", () => {
  it("follows the three spoken lines and the silent connect shot", () => {
    expect(heroCaptionAt(0)).toBe("heroLine1");
    expect(heroCaptionAt(1.25)).toBe("heroLine1");
    expect(heroCaptionAt(1.29)).toBe("heroLine2");
    expect(heroCaptionAt(3)).toBe("heroLine2");
    expect(heroCaptionAt(3.04)).toBeNull();
    expect(heroCaptionAt(4.2)).toBeNull();
    expect(heroCaptionAt(4.42)).toBe("heroLine3");
    expect(heroCaptionAt(HERO_FREEZE_TIME)).toBe("heroLine3");
  });
});
