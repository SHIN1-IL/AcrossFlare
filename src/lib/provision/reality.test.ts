import { describe, expect, it } from "vitest";
import {
  applyRealityInboundDefaults,
  canonicalizeRealityInbound,
  REALITY_MIN_CLIENT_VER,
  realityKeyForClient,
} from "@/lib/provision/reality";

describe("reality inbound defaults", () => {
  it("sets minClientVer for Karing-compatible Xray", () => {
    const reality = applyRealityInboundDefaults({ dest: "www.bing.com:443" });
    expect(reality.minClientVer).toBe("1.0.0");
    expect(reality.minClient).toBe(REALITY_MIN_CLIENT_VER);
  });

  it("rewrites padded REALITY keys to raw url-safe base64", () => {
    const raw = Buffer.alloc(32, 7);
    const padded = raw.toString("base64");
    expect(padded.endsWith("=")).toBe(true);
    const reality: Record<string, unknown> = {
      privateKey: padded,
      settings: { publicKey: padded },
      minClientVer: "1.0.0",
      minClient: "1.0.0",
    };

    expect(canonicalizeRealityInbound(reality)).toBe(true);
    expect(reality.privateKey).toBe(raw.toString("base64url"));
    expect((reality.settings as { publicKey: string }).publicKey).toBe(raw.toString("base64url"));
    expect(realityKeyForClient(padded)).toHaveLength(43);
    expect(canonicalizeRealityInbound(reality)).toBe(false);
  });
});
