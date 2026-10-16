import { describe, expect, it } from "vitest";
import { HOME_STORY_HEIGHT } from "@/lib/home-story-height";

describe("home story height", () => {
  it("keeps home story sections one viewport tall", () => {
    expect(HOME_STORY_HEIGHT.whyBuyLive).toBe("h-dvh");
    expect(HOME_STORY_HEIGHT.consoleKaring).toBe("h-dvh");
  });
});
