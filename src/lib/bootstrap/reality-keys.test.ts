import { describe, expect, it } from "vitest";
import { generateRealityKeyPair, generateRealityShortId } from "@/lib/bootstrap/reality-keys";

describe("reality-keys", () => {
  it("generates x25519 key material as raw url-safe base64", () => {
    const keys = generateRealityKeyPair();
    expect(keys.privateKey).toHaveLength(43);
    expect(keys.publicKey).toHaveLength(43);
    expect(keys.privateKey).not.toMatch(/[+/=]/);
    expect(keys.publicKey).not.toMatch(/[+/=]/);
    expect(Buffer.from(keys.privateKey, "base64url")).toHaveLength(32);
    expect(Buffer.from(keys.publicKey, "base64url")).toHaveLength(32);
  });

  it("generates an 8-char hex short id", () => {
    expect(generateRealityShortId()).toMatch(/^[0-9a-f]{8}$/);
  });
});
