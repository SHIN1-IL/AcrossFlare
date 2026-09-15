import { describe, expect, it } from "vitest";
import { MARKETING_PATH_SUFFIXES, marketingUrls } from "@/lib/marketing-urls";

describe("marketingUrls", () => {
  it("covers default-locale unprefixed paths and other locales", () => {
    const urls = marketingUrls("https://acrossflare.com");
    expect(urls).toContain("https://acrossflare.com/");
    expect(urls).toContain("https://acrossflare.com/standard");
    expect(urls).toContain("https://acrossflare.com/login");
    expect(urls).toContain("https://acrossflare.com/en");
    expect(urls).toContain("https://acrossflare.com/en/standard");
    expect(urls).toContain("https://acrossflare.com/zh/login");
    expect(urls).toContain("https://acrossflare.com/ja/signup");
    expect(urls).toContain("https://acrossflare.com/ko");
    expect(urls).toContain("https://acrossflare.com/ko/standard");
    expect(urls.length).toBeGreaterThan(4 * MARKETING_PATH_SUFFIXES.length);
  });
});
