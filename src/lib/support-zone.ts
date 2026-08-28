export const SUPPORT_HREF = "/support" as const;

export const SUPPORT_SECTIONS = [
  { id: "downloads" },
  { id: "setup" },
  { id: "faq" },
] as const;

export const KARING_SETUP_STEPS = [
  { id: "install" },
  { id: "profile" },
  { id: "connect" },
] as const;

export const KARING_INSTALL_PLATFORMS = [
  { id: "windows" },
  { id: "macos" },
  { id: "android" },
  { id: "ios" },
  { id: "linux" },
] as const;

export const KARING_FAQ_ITEMS = [
  { id: "profileWhere" },
  { id: "playStore" },
  { id: "macOpen" },
] as const;

export type SupportSectionId = (typeof SUPPORT_SECTIONS)[number]["id"];
export type KaringSetupStepId = (typeof KARING_SETUP_STEPS)[number]["id"];
export type KaringInstallPlatformId = (typeof KARING_INSTALL_PLATFORMS)[number]["id"];
export type KaringFaqId = (typeof KARING_FAQ_ITEMS)[number]["id"];

export function karingInstallPlatformFor(osId: string): KaringInstallPlatformId | null {
  return KARING_INSTALL_PLATFORMS.some((platform) => platform.id === osId)
    ? (osId as KaringInstallPlatformId)
    : null;
}
