import { describe, expect, it } from "vitest";
import { routing } from "@/i18n/routing";

describe("routing", () => {
  it("serves Korean at / without device-language negotiation", () => {
    expect(routing.defaultLocale).toBe("ko");
    expect(routing.localePrefix).toBe("as-needed");
    expect(routing.localeDetection).toBe(false);
    expect(routing.localeCookie).toBe(false);
  });
});
