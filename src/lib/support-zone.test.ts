import { describe, expect, it } from "vitest";
import ko from "../../messages/ko.json";
import {
  BACKUP_FAQ_ITEMS,
  BACKUP_SETUP_STEPS,
  KARING_FAQ_ITEMS,
  KARING_INSTALL_PLATFORMS,
  KARING_SETUP_STEPS,
  SUPPORT_HREF,
  SUPPORT_SECTIONS,
  karingInstallPlatformFor,
} from "@/lib/support-zone";

describe("support zone", () => {
  it("keeps download, setup, backup, and FAQ in that order on one page", () => {
    expect(SUPPORT_HREF).toBe("/support");
    expect(SUPPORT_SECTIONS.map((section) => section.id)).toEqual([
      "downloads",
      "setup",
      "backup",
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
    expect(KARING_FAQ_ITEMS.map((item) => item.id)).toEqual([
      "profileWhere",
      "playStore",
      "macOpen",
      "manualRefresh",
    ]);
    expect(BACKUP_SETUP_STEPS.map((step) => step.id)).toEqual(["open", "save", "optional"]);
    expect(BACKUP_FAQ_ITEMS.map((item) => item.id)).toEqual([
      "backupApp",
      "backupFromKaring",
      "vaultLogin",
      "deviceSync",
    ]);
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

  it("explains browser backup without requiring a home-screen app", () => {
    expect(ko.support.backup.title).toBe("백업 이용 방법");
    expect(ko.support.backup.heading).toContain("백업용 앱을 따로 받을 필요는 없습니다");
    expect(ko.support.faq.items.backupApp.a).toContain("브라우저로 Vaultwarden");
    expect(ko.support.faq.items.backupFromKaring.a).toContain("웹페이지 또는 공지");
    expect(ko.services.standard.features).toContain(
      "Vaultwarden (암호·메모 백업) — 비밀번호, 카드, 보안 메모를 암호화해 보관"
    );
    expect(ko.services.standard.features).toContain(
      "Syncthing (작은 파일 보관) — 중요한 작은 파일을 암호화해 보관"
    );
    expect(ko.app.backupDesc).not.toContain("홈 화면");
    expect(ko.app.vaultTitle).toBe("Vaultwarden (암호·메모 백업)");
    expect(ko.app.syncthingTitle).toBe("Syncthing (작은 파일 보관)");
  });

  it("keeps MarketingShell on the server page so the footer is not rendered from a client tree", async () => {
    const { readFile } = await import("node:fs/promises");
    const zone = await readFile("src/components/marketing/support-zone.tsx", "utf8");
    const page = await readFile("src/app/[locale]/support/page.tsx", "utf8");
    expect(zone).not.toContain("MarketingShell");
    expect(page).toContain("MarketingShell");
  });
});
