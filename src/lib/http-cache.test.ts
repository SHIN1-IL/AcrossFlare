import { describe, expect, it } from "vitest";
import {
  MARKETING_CACHE_SOURCES,
  PRIVATE_CACHE_SOURCES,
  PRIVATE_NO_STORE,
} from "@/lib/http-cache";

describe("http cache paths", () => {
  it("caches anonymous storefront HTML including login and signup shells", () => {
    expect(MARKETING_CACHE_SOURCES.join("\n")).toMatch(/\/login/);
    expect(MARKETING_CACHE_SOURCES.join("\n")).toMatch(/\/signup/);
    expect(MARKETING_CACHE_SOURCES.join("\n")).not.toMatch(/support|checkout|\/app|admin|dashboard|api/);
    expect(PRIVATE_CACHE_SOURCES).toEqual(
      expect.arrayContaining([
        "/:locale(en|ko|zh|ja)/support",
        "/:locale(en|ko|zh|ja)/app",
        "/:locale(en|ko|zh|ja)/admin",
        "/:locale(en|ko|zh|ja)/dashboard",
        "/api/auth/:path*",
      ])
    );
    expect(PRIVATE_CACHE_SOURCES.join("\n")).not.toMatch(/login|signup/);
    expect(PRIVATE_NO_STORE).toBe("private, no-store");
  });
});
