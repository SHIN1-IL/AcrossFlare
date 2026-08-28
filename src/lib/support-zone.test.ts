import { describe, expect, it } from "vitest";
import ko from "../../messages/ko.json";
import {
  KARING_FAQ_ITEMS,
  KARING_INSTALL_PLATFORMS,
  KARING_SETUP_STEPS,
  SUPPORT_HREF,
  SUPPORT_SECTIONS,
  karingInstallPlatformFor,
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

  it("explains Console QR setup without showing issued credentials on the support page", () => {
    expect(ko.support.lead).toBe("AcrossFlare를 이용해 주셔서 감사합니다.");
    expect(ko.support.setup.steps.profile.body).toContain("우측 상단 콘솔");
    expect(ko.support.setup.steps.profile.body).not.toContain("아래 QR");
    expect(ko.support.faq.items.profileWhere.a).toBe(ko.support.setup.steps.profile.body);
    expect(ko.support.setup.steps.profile).not.toHaveProperty("qrLabel");
    expect(ko.support.setup.steps.profile).not.toHaveProperty("empty");
  });
});
