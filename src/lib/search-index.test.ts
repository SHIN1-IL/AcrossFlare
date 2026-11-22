import { describe, expect, it } from "vitest";
import {
  absoluteLocaleUrl,
  crawlerDisallowPaths,
  NAVER_SITE_VERIFICATION,
  naverSiteVerificationMetadata,
  searchIndexEntries,
  searchOrigin,
} from "@/lib/search-index";

describe("searchOrigin", () => {
  it("uses the public site when the app URL is local", () => {
    expect(searchOrigin("http://localhost:3000")).toBe("https://acrossflare.com");
    expect(searchOrigin("http://127.0.0.1:3000")).toBe("https://acrossflare.com");
    expect(searchOrigin(undefined)).toBe("https://acrossflare.com");
  });

  it("keeps a deployed origin", () => {
    expect(searchOrigin("https://acrossflare.com/")).toBe("https://acrossflare.com");
  });
});

describe("searchIndexEntries", () => {
  const entries = searchIndexEntries("https://acrossflare.com");

  it("lists the Korean homepage without a locale prefix", () => {
    expect(entries.map((entry) => entry.url)).toContain("https://acrossflare.com");
    expect(entries.map((entry) => entry.url)).toContain("https://acrossflare.com/pricing");
    expect(entries.map((entry) => entry.url)).toContain("https://acrossflare.com/en/standard");
    expect(entries.map((entry) => entry.url)).toContain("https://acrossflare.com/ja/privacy");
    expect(entries.map((entry) => entry.url)).not.toContain("https://acrossflare.com/ko");
    expect(entries.map((entry) => entry.url)).not.toContain("https://acrossflare.com/login");
  });

  it("points every language alternate at the same page", () => {
    const home = entries.find((entry) => entry.url === "https://acrossflare.com");
    expect(home?.alternates.languages).toEqual({
      "x-default": "https://acrossflare.com",
      ko: "https://acrossflare.com",
      en: "https://acrossflare.com/en",
      zh: "https://acrossflare.com/zh",
      ja: "https://acrossflare.com/ja",
    });
  });
});

describe("crawlerDisallowPaths", () => {
  it("blocks consoles and dev pages in every locale", () => {
    const paths = crawlerDisallowPaths();
    expect(paths).toEqual(expect.arrayContaining(["/app", "/admin", "/en/app", "/ja/dev", "/ko/checkout", "/api"]));
    expect(paths).not.toContain("/pricing");
    expect(paths).not.toContain("/");
  });
});

describe("absoluteLocaleUrl", () => {
  it("drops the trailing slash on the default home", () => {
    expect(absoluteLocaleUrl("https://acrossflare.com", "ko", "/")).toBe("https://acrossflare.com");
    expect(absoluteLocaleUrl("https://acrossflare.com", "zh", "/terms")).toBe(
      "https://acrossflare.com/zh/terms",
    );
  });
});

describe("naverSiteVerificationMetadata", () => {
  it("omits the tag until Search Advisor issues a code", () => {
    expect(naverSiteVerificationMetadata(undefined)).toEqual({});
    expect(naverSiteVerificationMetadata("  ")).toEqual({});
  });

  it("emits the Naver ownership meta name", () => {
    expect(naverSiteVerificationMetadata(" abc123 ")).toEqual({
      verification: {
        other: {
          "naver-site-verification": "abc123",
        },
      },
    });
  });

  it("keeps the Search Advisor code for acrossflare.com", () => {
    expect(naverSiteVerificationMetadata(NAVER_SITE_VERIFICATION)).toEqual({
      verification: {
        other: {
          "naver-site-verification": "9afadf68e92814faa96c6144a21330435e278f39",
        },
      },
    });
  });
});
