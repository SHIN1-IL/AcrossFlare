import { describe, expect, it } from "vitest";
import { MARKETING_CACHE_SOURCES } from "@/lib/http-cache";
import { MARKETING_PATH_SUFFIXES, marketingUrls } from "@/lib/marketing-urls";

describe("marketingUrls", () => {
  it("covers every locale × storefront suffix", () => {
    const urls = marketingUrls("https://acrossflare.com");
    expect(urls).toHaveLength(4 * MARKETING_PATH_SUFFIXES.length);
    expect(urls).toContain("https://acrossflare.com/en");
    expect(urls).toContain("https://acrossflare.com/ko/standard");
    expect(urls).toContain("https://acrossflare.com/zh/login");
    expect(urls).toContain("https://acrossflare.com/ja/signup");
    expect(urls.some((url) => url.endsWith("/"))).toBe(false);
  });

  it("stays aligned with MARKETING_CACHE_SOURCES suffixes", () => {
    const fromSources = MARKETING_CACHE_SOURCES.map((source) =>
      source.replace(/^\/:locale\(en\|ko\|zh\|ja\)/, "")
    );
    expect(fromSources).toEqual([...MARKETING_PATH_SUFFIXES]);
  });
});
