import { describe, expect, it } from "vitest";
import { routing } from "@/i18n/routing";

describe("routing", () => {
  it("detects device language on first visit without a locale cookie", () => {
    expect(routing.localePrefix).toBe("always");
    expect(routing.localeDetection).toBe(true);
    expect(routing.localeCookie).toBe(false);
  });
});
