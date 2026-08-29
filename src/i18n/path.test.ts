import { describe, expect, it } from "vitest";
import { isCachedMarketingPath, cachedMarketingHref, localePath } from "@/i18n/path";

describe("localePath", () => {
  it("prefixes the marketing home and inner routes", () => {
    expect(localePath("ko", "/")).toBe("/ko");
    expect(localePath("ko", "/admin")).toBe("/ko/admin");
    expect(localePath("en", "/app")).toBe("/en/app");
  });

  it("keeps query strings after the locale prefix", () => {
    expect(localePath("ko", "/checkout?product=global&plan=global-lite")).toBe(
      "/ko/checkout?product=global&plan=global-lite"
    );
  });
});

describe("cachedMarketingHref", () => {
  it("prefixes cached storefront paths and optional hashes", () => {
    expect(cachedMarketingHref("ja", "/standard")).toBe("/ja/standard");
    expect(cachedMarketingHref("ko", "/terms", "refund")).toBe("/ko/terms#refund");
    expect(cachedMarketingHref("en", "/", "#plans")).toBe("/en#plans");
  });
});

describe("isCachedMarketingPath", () => {
  it("marks storefront pages that Cloudflare caches", () => {
    expect(isCachedMarketingPath("/")).toBe(true);
    expect(isCachedMarketingPath("/standard")).toBe(true);
    expect(isCachedMarketingPath("/privacy")).toBe(true);
  });

  it("leaves console, auth, and checkout on client navigation", () => {
    expect(isCachedMarketingPath("/login")).toBe(false);
    expect(isCachedMarketingPath("/checkout")).toBe(false);
    expect(isCachedMarketingPath("/app")).toBe(false);
    expect(isCachedMarketingPath("/admin")).toBe(false);
    expect(isCachedMarketingPath("/dashboard")).toBe(false);
    expect(isCachedMarketingPath("/support")).toBe(false);
  });
});
