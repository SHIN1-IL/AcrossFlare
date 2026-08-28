export const KARING_DOWNLOAD_PAGE = "https://karing.app/en/download" as const;
export const KARING_APP_STORE_URL = "https://apps.apple.com/app/karing/id6472431552" as const;
export const KARING_GITHUB_LATEST_API =
  "https://api.github.com/repos/KaringX/karing/releases/latest" as const;

export type KaringOsId = "windows" | "macos" | "android" | "ios" | "linux" | "other";

export type KaringOsLabel =
  | "windows"
  | "macos"
  | "macosIntel"
  | "macosAppleSilicon"
  | "android"
  | "ios"
  | "ipados"
  | "linux"
  | "other";

export type KaringArch = "x64" | "arm64" | "arm" | "unknown";

export type DetectedKaringOs = {
  id: KaringOsId;
  label: KaringOsLabel;
  arch: KaringArch;
};

export type DetectOsHints = {
  userAgent: string;
  platform?: string;
  maxTouchPoints?: number;
  uaPlatform?: string;
  architecture?: string;
};

export type NavigatorLike = {
  userAgent: string;
  platform?: string;
  maxTouchPoints?: number;
  userAgentData?: {
    platform?: string;
    getHighEntropyValues?: (
      hints: string[]
    ) => Promise<{ architecture?: string; platform?: string }>;
  };
};

export type KaringReleaseAsset = {
  name: string;
  browser_download_url: string;
};

export type KaringLatestRelease = {
  tagName: string;
  assets: KaringReleaseAsset[];
};

export type KaringDownloadSource = "github" | "app-store" | "fallback";

export type KaringDownload = {
  href: string;
  source: KaringDownloadSource;
};

type NextFetchInit = RequestInit & { next?: { revalidate: number } };

export function detectKaringOs(hints: DetectOsHints): DetectedKaringOs {
  const ua = hints.userAgent ?? "";
  const platform = `${hints.uaPlatform ?? ""} ${hints.platform ?? ""}`;
  const arch = detectArch(ua, hints.architecture);

  if (isIPad(hints)) {
    return { id: "ios", label: "ipados", arch: arch === "unknown" ? "arm64" : arch };
  }
  if (/iPhone|iPod/i.test(ua)) {
    return { id: "ios", label: "ios", arch: arch === "unknown" ? "arm64" : arch };
  }
  if (/Android/i.test(ua)) {
    return { id: "android", label: "android", arch };
  }
  if (/Windows|Win64|Win32/i.test(ua) || /Win/i.test(platform)) {
    return { id: "windows", label: "windows", arch };
  }
  if (/Mac OS X|Macintosh/i.test(ua) || /macOS/i.test(platform)) {
    const label =
      arch === "arm64" ? "macosAppleSilicon" : arch === "x64" ? "macosIntel" : "macos";
    return { id: "macos", label, arch };
  }
  if (/Linux|X11|CrOS/i.test(ua) || /Linux/i.test(platform)) {
    return { id: "linux", label: "linux", arch };
  }
  return { id: "other", label: "other", arch: "unknown" };
}

export function detectKaringOsFromNavigator(
  nav: NavigatorLike,
  extras?: { architecture?: string }
): DetectedKaringOs {
  return detectKaringOs({
    userAgent: nav.userAgent,
    platform: nav.platform,
    maxTouchPoints: nav.maxTouchPoints,
    uaPlatform: nav.userAgentData?.platform,
    architecture: extras?.architecture,
  });
}

export function pickKaringAsset(
  os: DetectedKaringOs,
  assets: readonly KaringReleaseAsset[]
): KaringReleaseAsset | null {
  let best: { asset: KaringReleaseAsset; score: number } | null = null;

  for (const asset of assets) {
    const score = scoreAsset(os, asset.name);
    if (score <= 0) continue;
    if (!best || score > best.score) {
      best = { asset, score };
    }
  }

  return best?.asset ?? null;
}

export function resolveKaringDownload(
  os: DetectedKaringOs,
  assets: readonly KaringReleaseAsset[]
): KaringDownload {
  if (os.id === "ios") {
    return { href: KARING_APP_STORE_URL, source: "app-store" };
  }

  const asset = pickKaringAsset(os, assets);
  if (asset) {
    return { href: asset.browser_download_url, source: "github" };
  }

  return { href: KARING_DOWNLOAD_PAGE, source: "fallback" };
}

export function parseKaringLatestRelease(body: unknown): KaringLatestRelease | null {
  if (!body || typeof body !== "object") return null;

  const tagName =
    "tag_name" in body && typeof body.tag_name === "string" ? body.tag_name.trim() : "";
  const rawAssets = "assets" in body ? body.assets : null;
  const assets = Array.isArray(rawAssets)
    ? rawAssets.flatMap((item) => {
        if (!isReleaseAsset(item)) return [];
        return [{ name: item.name, browser_download_url: item.browser_download_url }];
      })
    : [];

  if (!tagName && assets.length === 0) return null;
  return { tagName, assets };
}

export async function fetchKaringLatestRelease(): Promise<KaringLatestRelease | null> {
  try {
    const init: NextFetchInit = {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "acrossflare-app",
      },
    };
    if (typeof window === "undefined") {
      init.next = { revalidate: 600 };
    }

    const res = await fetch(KARING_GITHUB_LATEST_API, init);
    if (!res.ok) return null;
    return parseKaringLatestRelease(await res.json());
  } catch {
    return null;
  }
}

function isIPad(hints: DetectOsHints) {
  if (/iPad/i.test(hints.userAgent)) return true;
  const macLike =
    /Macintosh|Mac OS X/i.test(hints.userAgent) || /macOS|MacIntel|Mac/i.test(hints.platform ?? "");
  return macLike && (hints.maxTouchPoints ?? 0) > 1;
}

function detectArch(ua: string, architecture?: string): KaringArch {
  const hint = (architecture ?? "").toLowerCase();
  if (hint === "arm" || hint === "arm64" || hint === "aarch64") return "arm64";
  if (hint === "x86" || hint === "x64" || hint === "x86_64" || hint === "amd64") return "x64";

  if (/aarch64|arm64|apple silicon/i.test(ua)) return "arm64";
  if (/armeabi-v7a|armv7/i.test(ua)) return "arm";
  if (/Win64|WOW64|x64|x86_64|amd64/i.test(ua)) return "x64";
  return "unknown";
}

function scoreAsset(os: DetectedKaringOs, filename: string) {
  const name = filename.toLowerCase();

  if (os.id === "windows") {
    if (!name.includes("windows")) return 0;
    let score = 10;
    if (name.endsWith(".exe")) score += 30;
    else if (name.endsWith(".msi")) score += 20;
    else if (name.endsWith(".zip")) score += 10;
    else return 0;
    return score + archBonus(os.arch, name);
  }

  if (os.id === "macos") {
    if (!name.includes("macos") && !name.includes("darwin")) return 0;
    let score = 10;
    if (name.endsWith(".dmg")) score += 30;
    else if (name.endsWith(".zip")) score += 15;
    else return 0;
    if (name.includes("universal")) score += 12;
    return score + archBonus(os.arch, name);
  }

  if (os.id === "android") {
    if (!name.includes("android") || !name.endsWith(".apk")) return 0;
    let score = 10;
    if (/arm64-v8a|aarch64/.test(name)) {
      score += os.arch === "arm" ? 6 : 20;
    } else if (/armeabi-v7a|armv7/.test(name)) {
      score += os.arch === "arm" ? 20 : 4;
    } else if (/android_arm\.apk/.test(name)) {
      score += 8;
    }
    return score;
  }

  if (os.id === "linux") {
    if (!name.includes("linux")) return 0;
    let score = 10;
    if (name.endsWith(".appimage")) score += 30;
    else if (name.endsWith(".deb")) score += 18;
    else if (name.endsWith(".rpm")) score += 12;
    else return 0;
    return score + archBonus(os.arch, name);
  }

  return 0;
}

function archBonus(arch: KaringArch, name: string) {
  if (arch === "arm64" && /arm64|aarch64/.test(name)) return 8;
  if (arch === "x64" && /x64|amd64|x86_64/.test(name)) return 8;
  if (arch === "arm" && /armeabi-v7a|armv7/.test(name)) return 8;
  return 0;
}

function isReleaseAsset(value: unknown): value is KaringReleaseAsset {
  if (!value || typeof value !== "object") return false;
  const item = value as { name?: unknown; browser_download_url?: unknown };
  return typeof item.name === "string" && typeof item.browser_download_url === "string";
}
