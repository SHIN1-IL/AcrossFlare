import { describe, expect, it } from "vitest";
import { routing } from "@/i18n/routing";

describe("routing", () => {
  it("keeps locale in the URL so marketing HTML can be cached", () => {
    expect(routing.localePrefix).toBe("always");
    expect(routing.localeDetection).toBe(false);
    expect(routing.localeCookie).toBe(false);
  });
});
