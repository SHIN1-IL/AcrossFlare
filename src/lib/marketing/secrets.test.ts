import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SIMULATED_WG_SERVER_PUBLIC_KEY } from "@/lib/marketing/config";
import { generateWireGuardKeys } from "@/lib/marketing/secrets";

describe("marketing/secrets", () => {
  const env = { ...process.env };

  beforeEach(() => {
    process.env = { ...env };
    delete process.env.WG_SERVER_PUBLIC_KEY;
    delete process.env.PROVISION_MODE;
  });

  afterEach(() => {
    process.env = { ...env };
  });

  it("uses the configured server public key as the peer key", () => {
    process.env.WG_SERVER_PUBLIC_KEY = "server-public-key";
    const first = generateWireGuardKeys();
    const second = generateWireGuardKeys();

    expect(first.publicKey).toBe("server-public-key");
    expect(second.publicKey).toBe("server-public-key");
    expect(first.privateKey).not.toBe(second.privateKey);
    expect(first.clientPublicKey).not.toBe(first.publicKey);
  });

  it("falls back to a stable simulated server key", () => {
    const keys = generateWireGuardKeys();
    expect(keys.publicKey).toBe(SIMULATED_WG_SERVER_PUBLIC_KEY);
  });

  it("refuses live issuance without a server public key", () => {
    process.env.PROVISION_MODE = "live";
    expect(() => generateWireGuardKeys()).toThrow("wg_server_public_key_missing");
  });
});
