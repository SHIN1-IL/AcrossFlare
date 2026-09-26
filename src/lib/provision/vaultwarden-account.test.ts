import { createHmac, pbkdf2Sync } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildVaultwardenRegisterBody,
  decryptBitwarden,
  syncVaultwardenPassword,
  vaultwardenMasterPasswordHash,
} from "@/lib/provision/vaultwarden-account";

const originalToken = process.env.VAULTWARDEN_ADMIN_TOKEN;

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalToken === undefined) {
    delete process.env.VAULTWARDEN_ADMIN_TOKEN;
  } else {
    process.env.VAULTWARDEN_ADMIN_TOKEN = originalToken;
  }
});

describe("vaultwarden account password", () => {
  it("uses the same email and password hash the vault login form expects", () => {
    const email = "Person@Example.com";
    const password = "correct horse";
    const masterKey = pbkdf2Sync(password, "person@example.com", 600_000, 32, "sha256");
    const expected = pbkdf2Sync(masterKey, password, 1, 32, "sha256").toString("base64");

    expect(vaultwardenMasterPasswordHash(email, password)).toBe(expected);
    expect(vaultwardenMasterPasswordHash(email, password)).toBe(
      buildVaultwardenRegisterBody(email, password).masterPasswordHash
    );
  });

  it("encrypts the vault key so the same password can open it", () => {
    const body = buildVaultwardenRegisterBody("person@example.com", "correct horse");
    const masterKey = pbkdf2Sync("correct horse", "person@example.com", 600_000, 32, "sha256");
    const stretched = Buffer.concat([
      hkdfExpand(masterKey, "enc", 32),
      hkdfExpand(masterKey, "mac", 32),
    ]);
    const userKey = decryptBitwarden(body.key, stretched);
    const privateKey = decryptBitwarden(body.keys.encryptedPrivateKey, userKey);

    expect(body.email).toBe("person@example.com");
    expect(body.key.startsWith("2.")).toBe(true);
    expect(userKey).toHaveLength(64);
    expect(privateKey.length).toBeGreaterThan(0);
    expect(body.keys.publicKey.length).toBeGreaterThan(0);
  });

  it("skips the vault when the admin token is missing", async () => {
    delete process.env.VAULTWARDEN_ADMIN_TOKEN;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(syncVaultwardenPassword("person@example.com", "correct horse")).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("registers the homepage password when the vault user is new", async () => {
    process.env.VAULTWARDEN_ADMIN_TOKEN = "vault-token";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(syncVaultwardenPassword("person@example.com", "correct horse")).resolves.toBe(true);
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("/api/accounts/register");
    const registerBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(registerBody.email).toBe("person@example.com");
    expect(registerBody.masterPasswordHash).toBe(
      vaultwardenMasterPasswordHash("person@example.com", "correct horse")
    );
  });
});

function hkdfExpand(prk: Buffer, info: string, length: number) {
  const blocks: Buffer[] = [];
  let previous = Buffer.alloc(0);
  let counter = 1;
  while (Buffer.concat(blocks).length < length) {
    previous = createHmac("sha256", prk).update(previous).update(info).update(Buffer.from([counter])).digest();
    blocks.push(previous);
    counter += 1;
  }
  return Buffer.concat(blocks).subarray(0, length);
}
