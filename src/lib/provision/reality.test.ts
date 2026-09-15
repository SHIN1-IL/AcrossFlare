import { describe, expect, it } from "vitest";
import { applyRealityInboundDefaults, REALITY_MIN_CLIENT_VER } from "@/lib/provision/reality";

describe("reality inbound defaults", () => {
  it("sets minClientVer for Karing-compatible Xray", () => {
    const reality = applyRealityInboundDefaults({ dest: "www.bing.com:443" });
    expect(reality.minClientVer).toBe("1.0.0");
    expect(reality.minClient).toBe(REALITY_MIN_CLIENT_VER);
  });
});
