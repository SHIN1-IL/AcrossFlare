import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("story device frame", () => {
  it("uses real duo mm size, angular corners, phone portrait, and no crease", () => {
    const source = readFileSync("src/components/marketing/story-device-frame.tsx", "utf8");
    expect(source).toContain('aspect: "aspect-[1646/1178] max-[479px]:aspect-[1178/1646]"');
    expect(source).toContain("164.6mm");
    expect(source).toContain("117.8mm");
    expect(source).toContain('outerRadius: "rounded-[6px]"');
    expect(source).toContain('innerRadius: "rounded-[3px]"');
    expect(source).not.toContain("aspect-[5/4]");
    expect(source).not.toContain("aspect-[9/19.5]");
    expect(source).not.toContain("rounded-[2rem]");
    expect(source).not.toContain("radial-gradient(ellipse 70% 100%");
    expect(source).not.toContain("Center hinge");
  });
});
