import { describe, expect, it } from "vitest";
import { isBackupSurfacePath } from "@/lib/pwa-surface";

describe("isBackupSurfacePath", () => {
  it("matches the console and backup dashboard, including locale prefixes", () => {
    expect(isBackupSurfacePath("/app")).toBe(true);
    expect(isBackupSurfacePath("/en/app")).toBe(true);
    expect(isBackupSurfacePath("/ko/dashboard")).toBe(true);
    expect(isBackupSurfacePath("/zh/app/settings")).toBe(true);
  });

  it("leaves marketing HTML to the browser and CDN", () => {
    expect(isBackupSurfacePath("/")).toBe(false);
    expect(isBackupSurfacePath("/ko")).toBe(false);
    expect(isBackupSurfacePath("/en/login")).toBe(false);
    expect(isBackupSurfacePath("/ja/standard")).toBe(false);
  });
});
