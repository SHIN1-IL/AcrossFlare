import { describe, expect, it } from "vitest";
import {
  applyRealityDest,
  applyRealityInboundDefaults,
  canonicalizeRealityInbound,
  REALITY_DEST_HOST,
  REALITY_MIN_CLIENT_VER,
  realityDestHost,
  realityKeyForClient,
} from "@/lib/provision/reality";

describe("reality inbound defaults", () => {
  it("sets minClientVer for Karing-compatible Xray", () => {
    const reality = applyRealityInboundDefaults({ dest: "www.bing.com:443" });
    expect(reality.minClientVer).toBe("1.0.0");
    expect(reality.minClient).toBe(REALITY_MIN_CLIENT_VER);
  });

  it("uses one camouflage host for dest and server names", () => {
    expect(realityDestHost("")).toBe(REALITY_DEST_HOST);
    expect(realityDestHost("dl.google.com:443")).toBe("dl.google.com");
    expect(() => realityDestHost("www.cloudflare.com")).toThrow("reality_dest_cloudflare_forbidden");

    const reality: Record<string, unknown> = {
      dest: "www.microsoft.com:443",
      serverNames: ["www.microsoft.com", "dl.google.com"],
      settings: { publicKey: "keep-me", fingerprint: "chrome" },
    };
    applyRealityDest(reality, REALITY_DEST_HOST);
    expect(reality.dest).toBe("dl.google.com:443");
    expect(reality.target).toBe("dl.google.com:443");
    expect(reality.serverNames).toEqual(["dl.google.com"]);
    expect((reality.settings as { serverName: string; publicKey: string }).serverName).toBe("dl.google.com");
    expect((reality.settings as { publicKey: string }).publicKey).toBe("keep-me");
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
