import { describe, expect, it } from "vitest";
import {
  KARING_FAQ_ITEMS,
  KARING_INSTALL_PLATFORMS,
  KARING_SETUP_STEPS,
  SUPPORT_HREF,
  SUPPORT_SECTIONS,
  karingInstallPlatformFor,
  karingSetupProfilesFrom,
} from "@/lib/support-zone";

describe("support zone", () => {
  it("keeps download, setup, and FAQ in that order on one page", () => {
    expect(SUPPORT_HREF).toBe("/support");
    expect(SUPPORT_SECTIONS.map((section) => section.id)).toEqual([
      "downloads",
      "setup",
      "faq",
    ]);
  });

  it("puts auto-detect download first, then install / profile / connect, then FAQ", () => {
    expect(KARING_SETUP_STEPS.map((step) => step.id)).toEqual(["install", "profile", "connect"]);
    expect(KARING_INSTALL_PLATFORMS.map((platform) => platform.id)).toEqual([
      "windows",
      "macos",
      "android",
      "ios",
      "linux",
    ]);
    expect(KARING_FAQ_ITEMS.map((item) => item.id)).toEqual(["profileWhere", "playStore", "macOpen"]);
    expect(KARING_FAQ_ITEMS[0]?.id).toBe("profileWhere");
    expect(karingInstallPlatformFor("macos")).toBe("macos");
    expect(karingInstallPlatformFor("ios")).toBe("ios");
    expect(karingInstallPlatformFor("other")).toBeNull();
  });

  it("exposes issued Karing QR and YAML links from active lanes", () => {
    expect(
      karingSetupProfilesFrom({
        global: {
          status: "active",
          planName: "Standard",
          deepLink: "karing://install-config?url=https://example.com/a",
          yamlUrl: "https://example.com/a",
        },
        workspace: null,
      })
    ).toEqual([
      {
        id: "global",
        planName: "Standard",
        deepLink: "karing://install-config?url=https://example.com/a",
        yamlUrl: "https://example.com/a",
      },
    ]);
    expect(karingSetupProfilesFrom({ global: { status: "unpaid", planName: "X", deepLink: "", yamlUrl: "" }, workspace: null })).toEqual([]);
    expect(karingSetupProfilesFrom(null)).toEqual([]);
  });
});
