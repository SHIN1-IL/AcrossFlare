import { describe, expect, it } from "vitest";
import { isProtectedPath, localeFromPathname, stripLocalePrefix } from "@/i18n/path";

describe("protected marketing vs console paths", () => {
  it("protects default-locale and prefixed console routes", () => {
    expect(isProtectedPath("/app")).toBe(true);
    expect(isProtectedPath("/admin/standard")).toBe(true);
    expect(isProtectedPath("/checkout")).toBe(true);
    expect(isProtectedPath("/support")).toBe(true);
    expect(isProtectedPath("/dashboard")).toBe(true);
    expect(isProtectedPath("/en/app")).toBe(true);
    expect(isProtectedPath("/ko/checkout")).toBe(true);
  });

  it("leaves storefront public", () => {
    expect(isProtectedPath("/")).toBe(false);
    expect(isProtectedPath("/login")).toBe(false);
    expect(isProtectedPath("/en")).toBe(false);
    expect(isProtectedPath("/en/login")).toBe(false);
    expect(isProtectedPath("/pricing")).toBe(false);
  });

  it("reads locale from the first segment when present", () => {
    expect(localeFromPathname("/")).toBe("ko");
    expect(localeFromPathname("/login")).toBe("ko");
    expect(localeFromPathname("/en/app")).toBe("en");
    expect(localeFromPathname("/zh")).toBe("zh");
    expect(stripLocalePrefix("/en/app")).toBe("/app");
    expect(stripLocalePrefix("/app")).toBe("/app");
    expect(stripLocalePrefix("/ko")).toBe("/");
  });
});
