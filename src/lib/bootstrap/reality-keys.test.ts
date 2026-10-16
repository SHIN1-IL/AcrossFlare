import { describe, expect, it } from "vitest";
import { generateRealityKeyPair, generateRealityShortId } from "@/lib/bootstrap/reality-keys";

describe("reality-keys", () => {
  it("generates x25519 key material as standard base64", () => {
    const keys = generateRealityKeyPair();
    expect(keys.privateKey.length).toBeGreaterThan(20);
    expect(keys.publicKey.length).toBeGreaterThan(20);
    expect(Buffer.from(keys.privateKey, "base64").length).toBe(32);
    expect(Buffer.from(keys.publicKey, "base64").length).toBe(32);
  });

  it("generates an 8-char hex short id", () => {
    expect(generateRealityShortId()).toMatch(/^[0-9a-f]{8}$/);
  });
});
