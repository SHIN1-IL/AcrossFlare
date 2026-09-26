import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import ja from "../../messages/ja.json";
import ko from "../../messages/ko.json";
import zh from "../../messages/zh.json";
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
    expect(BACKUP_SETUP_STEPS.map((step) => step.id)).toEqual(["open", "save", "phone"]);
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
    expect(ko.support.faq.items.backupFromKaring.a).toContain("콘솔에서 백업");
    expect(ko.support.faq.items.deviceSync.a).toContain("내 파일");
    expect(ko.support.faq.items.deviceSync.a).toContain("콘솔의 백업");
    expect(ko.support.faq.items.deviceSync.a).not.toContain("폴더 ID");
    expect(ko.support.backup.steps.phone.body).toContain("내 파일");
    expect(ko.support.backup.steps.phone.body).not.toContain("폴더 ID");
    expect(ko.app.backupHowTo3).toContain("내 파일");
    expect(ko.services.standard.features).toContain(
      "Vaultwarden (암호·메모 백업) — 비밀번호, 카드, 보안 메모를 암호화해 보관"
    );
    expect(ko.services.standard.features.join("\n")).not.toContain("Syncthing");
    expect(ko.services.hybrid.features.join("\n")).not.toContain("Syncthing");
    expect(ko.services.workspace.features.join("\n")).not.toContain("Syncthing");
    expect(ko.app.backupDesc).not.toContain("Syncthing");
    expect(ko.app.backupDesc).not.toContain("홈 화면");
    expect(ko.support.faq.items.backupApp.a).not.toContain("Syncthing");
    expect(ko.support.faq.items.deviceSync.a).not.toContain("Syncthing");
    expect(ko.pwa.body).not.toContain("Syncthing");
    expect(ko.app.vaultTitle).toBe("Vaultwarden (암호·메모 백업)");
  });

  it("keeps the Karing import preview on the support guide and off the homepage", async () => {
    const { readFile } = await import("node:fs/promises");
    const [preview, css, guide, home, globalCss] = await Promise.all([
      readFile("src/components/marketing/karing-import-preview.tsx", "utf8"),
      readFile("src/components/marketing/karing-import-preview.module.css", "utf8"),
      readFile("src/components/marketing/karing-guide.tsx", "utf8"),
      readFile("src/app/[locale]/(marketing)/page.tsx", "utf8"),
      readFile("src/app/globals.css", "utf8"),
    ]);
    const previewCopy = {
      en: en.support.setup.preview,
      ja: ja.support.setup.preview,
      ko: ko.support.setup.preview,
      zh: zh.support.setup.preview,
    };

    expect(guide).toContain("KaringImportPreview");
    expect(guide).toContain('step.id === "profile"');
    expect(home).not.toContain("karing-import-preview");
    expect(home).not.toContain("KaringSetupGuide");
    expect(globalCss).not.toContain("karing-mask");
    expect(preview).toContain('aria-hidden="true"');
    expect(preview).toContain("IntersectionObserver");
    expect(preview).not.toContain("setInterval");
    expect(preview).not.toContain("setTimeout");
    expect(preview).not.toContain("<a ");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain("contain: layout paint");
    expect(css).toContain("@keyframes karing-mask");
    const frames = css.slice(css.indexOf("@keyframes"));
    expect(frames).not.toMatch(/\b(width|height|top|left|margin|padding|box-shadow|filter)\s*:/);
    expect(previewCopy.ko.copied).toBe("복사 완료");
    expect(previewCopy.ko.copy).toBe("구독 링크 복사");
    for (const messages of Object.values(previewCopy)) {
      expect(messages.node).toBe("Tokyo #1");
      expect(messages.latency).toBe("32ms");
      expect(messages.connected).toBe("CONNECTED");
      expect(messages.copy.length).toBeGreaterThan(0);
      expect(messages.copied.length).toBeGreaterThan(0);
    }
  });

  it("keeps the backup open preview on the first backup step and off the homepage", async () => {
    const { readFile } = await import("node:fs/promises");
    const [preview, css, guide, home, globalCss] = await Promise.all([
      readFile("src/components/marketing/backup-open-preview.tsx", "utf8"),
      readFile("src/components/marketing/backup-open-preview.module.css", "utf8"),
      readFile("src/components/marketing/backup-guide.tsx", "utf8"),
      readFile("src/app/[locale]/(marketing)/page.tsx", "utf8"),
      readFile("src/app/globals.css", "utf8"),
    ]);
    const previewCopy = {
      en: en.support.backup.preview,
      ja: ja.support.backup.preview,
      ko: ko.support.backup.preview,
      zh: zh.support.backup.preview,
    };

    expect(guide).toContain("BackupOpenPreview");
    expect(guide).toContain('step.id === "open"');
    expect(home).not.toContain("backup-open-preview");
    expect(globalCss).not.toContain("backup-vault");
    expect(preview).toContain('aria-hidden="true"');
    expect(preview).toContain("IntersectionObserver");
    expect(preview).not.toContain("setInterval");
    expect(preview).not.toContain("setTimeout");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain("contain: layout paint");
    const frames = css.slice(css.indexOf("@keyframes"));
    expect(frames).not.toMatch(/\b(width|height|top|left|margin|padding|box-shadow|filter)\s*:/);
    expect(previewCopy.ko.vault).toBe("금고 열기");
    expect(previewCopy.ko.files).toBe("내 파일");
    for (const messages of Object.values(previewCopy)) {
      expect(messages.vaultName).toBe("Vaultwarden");
      expect(messages.vault.length).toBeGreaterThan(0);
      expect(messages.files.length).toBeGreaterThan(0);
      expect(messages.file.length).toBeGreaterThan(0);
    }
  });

  it("keeps MarketingShell on the server page so the footer is not rendered from a client tree", async () => {
    const { readFile } = await import("node:fs/promises");
    const zone = await readFile("src/components/marketing/support-zone.tsx", "utf8");
    const page = await readFile("src/app/[locale]/(console)/support/page.tsx", "utf8");
    expect(zone).not.toContain("MarketingShell");
    expect(page).toContain("MarketingShell");
  });
});
