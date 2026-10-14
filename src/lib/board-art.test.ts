import { describe, expect, it } from "vitest";
import { BOARD_ART, BOARD_ART_ENABLED, HOME_STORY_HEIGHT } from "@/lib/board-art";

describe("board art", () => {
  it("keeps optimized plate URLs versioned and home story heights aligned", () => {
    expect(BOARD_ART.webp1920).toContain("circuit-preview-1920.webp");
    expect(BOARD_ART.jpeg1920).toContain("circuit-preview-1920.jpg");
    expect(BOARD_ART.webp1920).toMatch(/\?v=\d+/);
    expect(HOME_STORY_HEIGHT.whyBuyLive).toBe("h-dvh");
    expect(HOME_STORY_HEIGHT.consoleKaring).toBe("h-dvh");
  });

  it("parks motherboard plates behind a kill-switch for speed A/B", () => {
    expect(BOARD_ART_ENABLED).toBe(false);
  });
});
