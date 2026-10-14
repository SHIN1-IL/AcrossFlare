/** Shared motherboard plate art for home stories (size-stable, cache-busted). */
export const BOARD_ART_VERSION = 23;

/**
 * Temporary kill-switch: when false, every BoardArtImage mounts nothing
 * (home / story edges / plan stages). Art files stay in public/marketing for restore.
 */
export const BOARD_ART_ENABLED = false;

const q = `v=${BOARD_ART_VERSION}`;

/** Optimized plate — prefer WebP; JPEG is the universal fallback. */
export const BOARD_ART = {
  webp1920: `/marketing/circuit-preview-1920.webp?${q}`,
  webp1280: `/marketing/circuit-preview-1280.webp?${q}`,
  jpeg1920: `/marketing/circuit-preview-1920.jpg?${q}`,
  width: 1920,
  height: 1080,
} as const;

/** One-viewport home stories (autoplay in view; must match deferred shells). */
export const HOME_STORY_HEIGHT = {
  whyBuyLive: "h-dvh",
  consoleKaring: "h-dvh",
} as const;
