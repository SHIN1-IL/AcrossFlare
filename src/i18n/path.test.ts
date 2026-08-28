import { describe, expect, it } from "vitest";
import { localePath } from "@/i18n/path";

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
