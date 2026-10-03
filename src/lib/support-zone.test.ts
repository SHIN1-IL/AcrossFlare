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

  it("puts auto-detect download first, then install / addProfile / profile / connect / done, then FAQ", () => {
    expect(KARING_SETUP_STEPS.map((step) => step.id)).toEqual([
      "install",
      "addProfile",
      "profile",
      "connect",
      "done",
    ]);
    expect(ko.support.setup.steps.done.title).toBe("완료");
    expect(ko.support.setup.heading).toContain("5단계");
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
    expect(ko.support.backup.steps.open.title).toBe("콘솔에서 금고 열기");
    expect(ko.support.backup.steps.save.title).toBe(
      "금고 열고, Vaultwarden에서 로그인 후, 암호·메모·작은파일 저장"
    );
    expect(ko.support.backup.steps.phone.title).toBe("콘솔에서 작은 파일 저장");
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
    const [preview, css, guide, home, globalCss, connect, addPreview, addCss, ping, pingCss] =
      await Promise.all([
        readFile("src/components/marketing/karing-import-preview.tsx", "utf8"),
        readFile("src/components/marketing/karing-import-preview.module.css", "utf8"),
        readFile("src/components/marketing/karing-guide.tsx", "utf8"),
        readFile("src/app/[locale]/(marketing)/page.tsx", "utf8"),
        readFile("src/app/globals.css", "utf8"),
        readFile("src/components/marketing/karing-connect-preview.tsx", "utf8"),
        readFile("src/components/marketing/karing-add-profile-preview.tsx", "utf8"),
        readFile("src/components/marketing/karing-add-profile-preview.module.css", "utf8"),
        readFile("src/components/marketing/karing-ping-preview.tsx", "utf8"),
        readFile("src/components/marketing/karing-ping-preview.module.css", "utf8"),
      ]);
    const previewCopy = {
      en: en.support.setup.preview,
      ja: ja.support.setup.preview,
      ko: ko.support.setup.preview,
      zh: zh.support.setup.preview,
    };

    expect(guide).toContain("KaringAddProfilePreview");
    expect(guide).toContain("KaringImportPreview");
    expect(guide).toContain("KaringConnectPreview");
    expect(guide).toContain("KaringPingPreview");
    expect(guide).toContain('step.id === "addProfile"');
    expect(guide).toContain('step.id === "profile"');
    expect(guide).toContain('step.id === "connect"');
    expect(home).not.toContain("karing-import-preview");
    expect(home).not.toContain("karing-connect-preview");
    expect(home).not.toContain("karing-ping-preview");
    expect(home).not.toContain("karing-add-profile-preview");
    expect(home).not.toContain("KaringSetupGuide");
    expect(globalCss).not.toContain("karing-mask");
    expect(preview).toContain('aria-hidden="true"');
    expect(preview).toContain("IntersectionObserver");
    expect(preview).toContain("FakeQr");
    expect(preview).toContain("setup.preview.linkTitle");
    expect(preview).toContain("setup.preview.link.placeholder");
    expect(preview).toContain("RedCorner");
    expect(preview).not.toContain("Tokyo");
    expect(preview).not.toContain("setInterval");
    expect(preview).not.toContain("setTimeout");
    expect(preview).not.toContain("<a ");
    expect(addPreview).toContain("setup.preview.menu.link");
    expect(addPreview).toContain("setup.preview.menu.scan");
    expect(addPreview).not.toContain("node-tokyo");
    expect(addPreview).toContain("IntersectionObserver");
    expect(addCss).toContain("@keyframes karing-add-ripple");
    expect(addCss).toContain("@keyframes karing-add-ripple-link");
    expect(addCss).toContain("@keyframes karing-add-ripple-scan");
    expect(addCss).toContain("@keyframes karing-add-main");
    expect(addCss).toContain("prefers-reduced-motion: reduce");
    expect(addPreview).toContain("max-w-[460px]");
    expect(addPreview).toContain('highlight="link"');
    expect(addPreview).toContain('highlight="scan"');
    expect(connect).toContain("node-tokyo");
    expect(connect).toContain("IntersectionObserver");
    expect(ping).toContain("node-tokyo");
    expect(ping).toContain("node-la-a");
    expect(ping).toContain("IntersectionObserver");
    expect(pingCss).toContain("@keyframes karing-ping-track");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain("contain: layout paint");
    expect(css).toContain("@keyframes karing-mask");
    expect(css).toContain("@keyframes karing-scan");
    const frames = css.slice(css.indexOf("@keyframes"));
    expect(frames).not.toMatch(/\b(width|height|top|left|margin|padding|box-shadow|filter)\s*:/);
    expect(previewCopy.ko.copied).toBe("복사 완료");
    expect(previewCopy.ko.copy).toBe("구독 링크 복사");
    expect(ko.support.setup.steps.connect.title).toBe("연결 시작 및 핑 테스트");
    for (const messages of Object.values(previewCopy)) {
      expect(messages).not.toHaveProperty("node");
      expect(messages.connect.node).toBe("node-tokyo");
      expect(messages.connect.latency).toBe("43 ms ›");
      expect(messages.ping.selectServer).toBe("Select Server");
      expect(messages.menu.link).toBe("Add Profile Link");
      expect(messages.menu.scan).toBe("Scan QR Code");
      expect(messages.linkTitle).toBe("Add Profile Link");
      expect(messages.link.placeholder).toBe("Profile Link/Content");
      expect(messages.copy.length).toBeGreaterThan(0);
      expect(messages.copied.length).toBeGreaterThan(0);
      expect(messages.scanTitle.length).toBeGreaterThan(0);
    }
    expect(previewCopy.ko.scanTitle).toBe("QR 코드 스캔");
  });

  it("keeps the backup open preview on the first backup step and off the homepage", async () => {
    const { readFile } = await import("node:fs/promises");
    const [preview, css, guide, home, globalCss, vaultPreview, vaultCss, filesPreview, filesCss] =
      await Promise.all([
        readFile("src/components/marketing/backup-open-preview.tsx", "utf8"),
        readFile("src/components/marketing/backup-open-preview.module.css", "utf8"),
        readFile("src/components/marketing/backup-guide.tsx", "utf8"),
        readFile("src/app/[locale]/(marketing)/page.tsx", "utf8"),
        readFile("src/app/globals.css", "utf8"),
        readFile("src/components/marketing/backup-vault-preview.tsx", "utf8"),
        readFile("src/components/marketing/backup-vault-preview.module.css", "utf8"),
        readFile("src/components/marketing/backup-files-preview.tsx", "utf8"),
        readFile("src/components/marketing/backup-files-preview.module.css", "utf8"),
      ]);
    const previewCopy = {
      en: en.support.backup.preview,
      ja: ja.support.backup.preview,
      ko: ko.support.backup.preview,
      zh: zh.support.backup.preview,
    };

    expect(guide).toContain("BackupOpenPreview");
    expect(guide).toContain("BackupVaultPreview");
    expect(guide).toContain("BackupFilesPreview");
    expect(guide).toContain('step.id === "open"');
    expect(guide).toContain('step.id === "save"');
    expect(guide).toContain('step.id === "phone"');
    expect(home).not.toContain("backup-open-preview");
    expect(home).not.toContain("backup-vault-preview");
    expect(home).not.toContain("backup-files-preview");
    expect(globalCss).not.toContain("backup-vault");
    expect(preview).toContain('aria-hidden="true"');
    expect(preview).toContain("IntersectionObserver");
    expect(preview).toContain("backup.preview.nav");
    expect(preview).toContain("backup.preview.vault");
    expect(preview).toContain("acrossflare.com/console");
    expect(preview).not.toContain("setInterval");
    expect(preview).not.toContain("setTimeout");
    expect(vaultPreview).toContain("vault.acrossflare.com");
    expect(vaultPreview).toContain("backup.preview.vw.continue");
    expect(vaultPreview).toContain("backup.preview.vw.submit");
    expect(vaultPreview).toContain("IntersectionObserver");
    expect(vaultCss).toContain("@keyframes vw-login-out");
    expect(vaultCss).toContain("@keyframes vw-vault-in");
    expect(filesPreview).toContain("backup.preview.drop");
    expect(filesPreview).toContain("backup.preview.file");
    expect(filesPreview).toContain("IntersectionObserver");
    expect(filesCss).toContain("@keyframes backup-drag-file");
    expect(filesCss).toContain("@keyframes backup-dropped-in");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain("contain: layout paint");
    expect(css).toContain("@keyframes backup-console");
    expect(css).toContain("@keyframes backup-vault-ripple");
    const frames = css.slice(css.indexOf("@keyframes"));
    expect(frames).not.toMatch(/\b(width|height|top|left|margin|padding|box-shadow|filter)\s*:/);
    expect(previewCopy.ko.vault).toBe("금고 열기");
    expect(previewCopy.ko.files).toBe("내 파일");
    expect(previewCopy.ko.nav).toBe("백업");
    expect(previewCopy.ko.console).toBe("콘솔");
    expect(previewCopy.ko.vw.login).toBe("로그인");
    for (const messages of Object.values(previewCopy)) {
      expect(messages.vaultName).toBe("Vaultwarden");
      expect(messages.vault.length).toBeGreaterThan(0);
      expect(messages.files.length).toBeGreaterThan(0);
      expect(messages.file.length).toBeGreaterThan(0);
      expect(messages.nav.length).toBeGreaterThan(0);
      expect(messages.backupTitle.length).toBeGreaterThan(0);
      expect(messages.vw.continue.length).toBeGreaterThan(0);
      expect(messages.vw.submit.length).toBeGreaterThan(0);
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
