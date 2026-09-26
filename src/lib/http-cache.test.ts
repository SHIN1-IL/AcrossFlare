import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  MARKETING_CACHE_SOURCES,
  PRIVATE_CACHE_SOURCES,
  PRIVATE_NO_STORE,
} from "@/lib/http-cache";

describe("http cache paths", () => {
  it("caches anonymous storefront HTML and keeps auth shells private", () => {
    expect(MARKETING_CACHE_SOURCES).toContain("/");
    expect(MARKETING_CACHE_SOURCES).not.toContain("/login");
    expect(MARKETING_CACHE_SOURCES).not.toContain("/signup");
    expect(MARKETING_CACHE_SOURCES.join("\n")).not.toMatch(/\/:locale\(en\|ko\|zh\|ja\)\/login/);
    expect(MARKETING_CACHE_SOURCES.join("\n")).not.toMatch(/support|checkout|\/app|admin|dashboard|api/);
    expect(PRIVATE_CACHE_SOURCES).toEqual(
      expect.arrayContaining([
        "/login",
        "/signup",
        "/app",
        "/admin",
        "/dashboard",
        "/:locale(en|ko|zh|ja)/login",
        "/:locale(en|ko|zh|ja)/signup",
        "/:locale(en|ko|zh|ja)/support",
        "/:locale(en|ko|zh|ja)/app",
        "/:locale(en|ko|zh|ja)/admin",
        "/:locale(en|ko|zh|ja)/dashboard",
        "/api/auth/:path*",
      ])
    );
    expect(PRIVATE_CACHE_SOURCES).not.toContain("/");
    expect(PRIVATE_NO_STORE).toBe("private, no-store");
  });

  it("keeps the Cloudflare marketing expression on public pages only", () => {
    const script = readFileSync("infra/scripts/ensure-cloudflare-cache-rules.sh", "utf8");
    const expr = script.match(/MARKETING_EXPR='([^']+)'/)?.[1] ?? "";
    expect(expr).toContain('"/standard"');
    expect(expr).toContain('"/hybrid"');
    expect(expr).toContain('"/workspace"');
    expect(expr).toContain('"/pricing"');
    expect(expr).toContain('"/terms"');
    expect(expr).toContain('"/privacy"');
    expect(expr).toContain('"/"');
    for (const blocked of ["/login", "/signup", "/support", "/checkout", "/app", "/admin", "/dashboard", "/api"]) {
      expect(expr).not.toContain(`"${blocked}"`);
    }
    expect(MARKETING_CACHE_SOURCES).toContain("/standard");
  });
});
