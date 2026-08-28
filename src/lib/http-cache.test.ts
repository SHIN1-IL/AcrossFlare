import { describe, expect, it } from "vitest";
import {
  MARKETING_CACHE_SOURCES,
  PRIVATE_CACHE_SOURCES,
  PRIVATE_NO_STORE,
} from "@/lib/http-cache";

describe("http cache paths", () => {
  it("caches marketing HTML and never login, console, or session APIs", () => {
    expect(MARKETING_CACHE_SOURCES.join("\n")).not.toMatch(/login|signup|support|checkout|\/app|admin|dashboard|api/);
    expect(PRIVATE_CACHE_SOURCES).toEqual(
      expect.arrayContaining([
        "/:locale(en|ko|zh|ja)/login",
        "/:locale(en|ko|zh|ja)/app",
        "/:locale(en|ko|zh|ja)/admin",
        "/:locale(en|ko|zh|ja)/dashboard",
        "/api/auth/:path*",
      ])
    );
    expect(PRIVATE_NO_STORE).toBe("private, no-store");
  });
});
