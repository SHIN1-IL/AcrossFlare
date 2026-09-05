import { describe, expect, it } from "vitest";
import { isCachedMarketingPath, cachedMarketingHref, documentHref, localePath } from "@/i18n/path";

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

describe("documentHref", () => {
  it("prefixes private routes and hashes so the browser follows login 307s", () => {
    expect(documentHref("ko", "/support", "downloads")).toBe("/ko/support#downloads");
    expect(documentHref("en", "/checkout?product=global&plan=global-lite")).toBe(
      "/en/checkout?product=global&plan=global-lite"
    );
    expect(documentHref("ja", "/app")).toBe("/ja/app");
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
    expect(isCachedMarketingPath("/login")).toBe(true);
    expect(isCachedMarketingPath("/signup")).toBe(true);
  });

  it("leaves console and checkout on client navigation", () => {
    expect(isCachedMarketingPath("/checkout")).toBe(false);
    expect(isCachedMarketingPath("/app")).toBe(false);
    expect(isCachedMarketingPath("/admin")).toBe(false);
    expect(isCachedMarketingPath("/dashboard")).toBe(false);
    expect(isCachedMarketingPath("/support")).toBe(false);
  });
});
