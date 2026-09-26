import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("hero intro", () => {
  it("keeps the first screen copy and uses timed static previews", async () => {
    const [page, intro] = await Promise.all([
      readFile("src/app/[locale]/(marketing)/page.tsx", "utf8"),
      readFile("src/components/marketing/hero-intro.tsx", "utf8"),
    ]);

    expect(page).toContain("<HeroIntro />");
    expect(page).toContain("<PlanStages");
    expect(intro).toContain("AcrossFlare");
    expect(intro).toContain("Secure Cloud & Network Optimization");
    expect(page).not.toContain("HeroAtmosphereLazy");
    expect(intro).toContain("HeroAtmosphereLazy");
    expect(intro).toContain("SHRINK_MS = 3000");
    expect(intro).toContain("duration-[3000ms]");
    expect(intro).toContain("onPointerDown");
    expect(intro).toContain('labels("ping")');
    expect(intro).toContain("LINE_MS = 2000");
    expect(intro).toContain('t("headline")');
    expect(intro).toContain("QrScan");
    expect(intro).toContain("translate-y-full");
    expect(intro).toContain('labels("zoom")');
    expect(intro).not.toContain("% FRAMES.length");
    expect(intro).not.toContain("1400");
    expect(intro).toContain("across@");
    expect(intro).toContain("prefers-reduced-motion");
    expect(intro).toContain('labels("urlSample")');
    expect(intro).not.toContain("flag=clash");
    expect(intro).not.toContain("d0e744");
  });
});