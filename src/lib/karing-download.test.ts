import { afterEach, describe, expect, it, vi } from "vitest";
import {
  KARING_APP_STORE_URL,
  KARING_DOWNLOAD_PAGE,
  detectKaringOs,
  detectKaringOsFromNavigator,
  fetchKaringLatestRelease,
  parseKaringLatestRelease,
  pickKaringAsset,
  resolveKaringDownload,
} from "@/lib/karing-download";

const RELEASE_ASSETS = [
  {
    name: "karing_1.2.23.2606_android_arm.apk",
    browser_download_url: "https://github.com/KaringX/karing/releases/download/v1/android_arm.apk",
  },
  {
    name: "karing_1.2.23.2606_android_arm64-v8a.apk",
    browser_download_url: "https://github.com/KaringX/karing/releases/download/v1/android_arm64.apk",
  },
  {
    name: "karing_1.2.23.2606_android_armeabi-v7a.apk",
    browser_download_url: "https://github.com/KaringX/karing/releases/download/v1/android_v7a.apk",
  },
  {
    name: "karing_1.2.23.2606_linux_amd64.AppImage",
    browser_download_url: "https://github.com/KaringX/karing/releases/download/v1/linux.AppImage",
  },
  {
    name: "karing_1.2.23.2606_macos_universal.dmg",
    browser_download_url: "https://github.com/KaringX/karing/releases/download/v1/macos.dmg",
  },
  {
    name: "karing_1.2.23.2606_windows_x64.exe",
    browser_download_url: "https://github.com/KaringX/karing/releases/download/v1/windows.exe",
  },
  {
    name: "karing_1.2.23.2606_windows_x64.zip",
    browser_download_url: "https://github.com/KaringX/karing/releases/download/v1/windows.zip",
  },
];

describe("detectKaringOs", () => {
  it("detects Windows, macOS, Android, and iOS from User-Agent", () => {
    expect(
      detectKaringOs({
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      })
    ).toMatchObject({ id: "windows", label: "windows", arch: "x64" });

    expect(
      detectKaringOs({
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
      })
    ).toMatchObject({ id: "macos", label: "macos" });

    expect(
      detectKaringOs({
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
        architecture: "x64",
      })
    ).toMatchObject({ id: "macos", label: "macosIntel", arch: "x64" });

    expect(
      detectKaringOs({
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
        architecture: "arm",
      })
    ).toMatchObject({ id: "macos", label: "macosAppleSilicon", arch: "arm64" });

    expect(
      detectKaringOs({
        userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36",
      })
    ).toMatchObject({ id: "android", label: "android" });

    expect(
      detectKaringOs({
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      })
    ).toMatchObject({ id: "ios", label: "ios" });
  });

  it("treats iPad and iPadOS desktop UA as iPadOS, not macOS", () => {
    expect(
      detectKaringOs({
        userAgent: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      })
    ).toMatchObject({ id: "ios", label: "ipados" });

    expect(
      detectKaringOs({
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
        platform: "MacIntel",
        maxTouchPoints: 5,
      })
    ).toMatchObject({ id: "ios", label: "ipados" });
  });

  it("falls back to other when the UA is empty or unknown", () => {
    expect(detectKaringOs({ userAgent: "" })).toMatchObject({ id: "other", label: "other" });
    expect(detectKaringOs({ userAgent: "curl/8.0" })).toMatchObject({ id: "other" });
  });

  it("reads Client Hints from a navigator-like object", () => {
    expect(
      detectKaringOsFromNavigator({
        userAgent: "Mozilla/5.0",
        userAgentData: { platform: "Windows" },
      })
    ).toMatchObject({ id: "windows" });
  });
});

describe("resolveKaringDownload", () => {
  it("picks the Windows installer over the zip", () => {
    const os = detectKaringOs({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    });
    expect(pickKaringAsset(os, RELEASE_ASSETS)?.name).toContain("windows_x64.exe");
    expect(resolveKaringDownload(os, RELEASE_ASSETS)).toEqual({
      href: "https://github.com/KaringX/karing/releases/download/v1/windows.exe",
      source: "github",
    });
  });

  it("picks the universal macOS dmg for Intel and Apple Silicon", () => {
    const intel = detectKaringOs({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    });
    const silicon = detectKaringOs({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      architecture: "arm64",
    });
    expect(resolveKaringDownload(intel, RELEASE_ASSETS).href).toContain("macos.dmg");
    expect(resolveKaringDownload(silicon, RELEASE_ASSETS).href).toContain("macos.dmg");
  });

  it("picks arm64 APK for typical Android and v7a for older ARM", () => {
    const modern = detectKaringOs({
      userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36",
    });
    const older = detectKaringOs({
      userAgent: "Mozilla/5.0 (Linux; Android 8.0; SM-G930F Build/R16NW; armeabi-v7a)",
    });
    expect(pickKaringAsset(modern, RELEASE_ASSETS)?.name).toContain("arm64-v8a");
    expect(pickKaringAsset(older, RELEASE_ASSETS)?.name).toContain("armeabi-v7a");
  });

  it("sends iOS and iPadOS to the App Store even when APKs exist", () => {
    const ios = detectKaringOs({
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    });
    expect(resolveKaringDownload(ios, RELEASE_ASSETS)).toEqual({
      href: KARING_APP_STORE_URL,
      source: "app-store",
    });
  });

  it("does not pick a Windows zip for macOS or the first Android APK for arm64 phones", () => {
    const scrambled = [
      RELEASE_ASSETS[6],
      RELEASE_ASSETS[0],
      RELEASE_ASSETS[4],
      RELEASE_ASSETS[1],
    ];
    const mac = detectKaringOs({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    });
    const android = detectKaringOs({
      userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36",
    });
    expect(pickKaringAsset(mac, scrambled)?.name).toContain("macos_universal.dmg");
    expect(pickKaringAsset(android, scrambled)?.name).toContain("arm64-v8a");
  });

  it("falls back to the official download page when assets are missing or the OS is unknown", () => {
    const windows = detectKaringOs({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    });
    expect(resolveKaringDownload(windows, [])).toEqual({
      href: KARING_DOWNLOAD_PAGE,
      source: "fallback",
    });
    expect(resolveKaringDownload(detectKaringOs({ userAgent: "" }), RELEASE_ASSETS)).toEqual({
      href: KARING_DOWNLOAD_PAGE,
      source: "fallback",
    });
  });
});

describe("parseKaringLatestRelease", () => {
  it("extracts the tag and installer assets from the GitHub payload", () => {
    expect(
      parseKaringLatestRelease({
        tag_name: "v1.2.23.2606",
        assets: RELEASE_ASSETS,
      })
    ).toEqual({
      tagName: "v1.2.23.2606",
      assets: RELEASE_ASSETS,
    });
  });

  it("ignores malformed payloads", () => {
    expect(parseKaringLatestRelease(null)).toBeNull();
    expect(parseKaringLatestRelease({ tag_name: 1, assets: "nope" })).toBeNull();
  });
});

describe("fetchKaringLatestRelease", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses GitHub latest release assets and tag", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ tag_name: "v1.2.23.2606", assets: RELEASE_ASSETS }),
      })
    );

    await expect(fetchKaringLatestRelease()).resolves.toEqual({
      tagName: "v1.2.23.2606",
      assets: RELEASE_ASSETS,
    });
  });

  it("returns null on rate-limit or network failure so callers can fall back", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403 }));
    await expect(fetchKaringLatestRelease()).resolves.toBeNull();

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    await expect(fetchKaringLatestRelease()).resolves.toBeNull();
  });
});
