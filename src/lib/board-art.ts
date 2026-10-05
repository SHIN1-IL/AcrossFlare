/** Shared motherboard plate art for home stories (size-stable, cache-busted). */
export const BOARD_ART_VERSION = 23;

const q = `v=${BOARD_ART_VERSION}`;

/** Optimized plate — prefer WebP; JPEG is the universal fallback. */
export const BOARD_ART = {
  webp1920: `/marketing/circuit-preview-1920.webp?${q}`,
  webp1280: `/marketing/circuit-preview-1280.webp?${q}`,
  jpeg1920: `/marketing/circuit-preview-1920.jpg?${q}`,
  width: 1920,
  height: 1080,
} as const;

/** Must match live story section heights so deferred shells do not jump scroll. */
export const HOME_STORY_HEIGHT = {
  whyBuyLive: "h-[380vh]",
  consoleKaring: "h-[520vh]",
} as const;
