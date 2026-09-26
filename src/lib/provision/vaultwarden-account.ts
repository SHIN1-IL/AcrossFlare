import { createCipheriv, createDecipheriv, createHmac, pbkdf2Sync, randomBytes, generateKeyPairSync } from "node:crypto";
import { vaultwardenAdminToken, vaultwardenApiBaseUrl } from "@/lib/provision/config";
import { inviteVaultwardenUser } from "@/lib/provision/vaultwarden";

const KDF_ITERATIONS = 600_000;

export type VaultwardenRegisterBody = {
  email: string;
  masterPasswordHash: string;
  masterPasswordHint: string;
  key: string;
  kdf: 0;
  kdfIterations: number;
  keys: {
    publicKey: string;
    encryptedPrivateKey: string;
  };
};

export function vaultwardenMasterPasswordHash(email: string, password: string) {
  const salt = email.trim().toLowerCase();
  const masterKey = pbkdf2Sync(password, salt, KDF_ITERATIONS, 32, "sha256");
  return pbkdf2Sync(masterKey, password, 1, 32, "sha256").toString("base64");
}

export function buildVaultwardenRegisterBody(email: string, password: string): VaultwardenRegisterBody {
  const normalized = email.trim().toLowerCase();
  const masterKey = pbkdf2Sync(password, normalized, KDF_ITERATIONS, 32, "sha256");
  const stretched = stretchMasterKey(masterKey);
  const userKey = randomBytes(64);
  const { publicKey, privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "der" },
    privateKeyEncoding: { type: "pkcs8", format: "der" },
  });

  return {
    email: normalized,
    masterPasswordHash: pbkdf2Sync(masterKey, password, 1, 32, "sha256").toString("base64"),
    masterPasswordHint: "",
    key: encryptBitwarden(userKey, stretched),
    kdf: 0,
    kdfIterations: KDF_ITERATIONS,
    keys: {
      publicKey: publicKey.toString("base64"),
      encryptedPrivateKey: encryptBitwarden(privateKey, userKey),
    },
  };
}

export function decryptBitwarden(payload: string, key: Buffer) {
  const [type, data] = payload.split(".");
  if (type !== "2" || !data) {
    throw new Error("vaultwarden_cipher_unsupported");
  }
  const [ivPart, cipherPart, macPart] = data.split("|");
  if (!ivPart || !cipherPart || !macPart) {
    throw new Error("vaultwarden_cipher_invalid");
  }
  const iv = Buffer.from(ivPart, "base64");
  const cipherText = Buffer.from(cipherPart, "base64");
  const mac = Buffer.from(macPart, "base64");
  const macKey = key.subarray(32, 64);
  const expected = createHmac("sha256", macKey).update(iv).update(cipherText).digest();
  if (expected.length !== mac.length || !expected.equals(mac)) {
    throw new Error("vaultwarden_cipher_mac");
  }
  const decipher = createDecipheriv("aes-256-cbc", key.subarray(0, 32), iv);
  return Buffer.concat([decipher.update(cipherText), decipher.final()]);
}

/** Creates or aligns the Vaultwarden login with the AcrossFlare email and password. */
export async function syncVaultwardenPassword(
  email: string,
  password: string,
  previousPassword?: string
) {
  if (!vaultwardenAdminToken() || !email || !password) {
    return false;
  }

  const normalized = email.trim().toLowerCase();
  await inviteVaultwardenUser(normalized).catch(() => false);

  const body = buildVaultwardenRegisterBody(normalized, password);
  const registered = await postJson("/api/accounts/register", body);
  if (registered.ok) {
    return true;
  }

  if (await vaultwardenLogin(normalized, body.masterPasswordHash)) {
    return true;
  }

  if (!previousPassword || previousPassword === password) {
    return false;
  }

  const previousHash = vaultwardenMasterPasswordHash(normalized, previousPassword);
  const session = await vaultwardenLogin(normalized, previousHash);
  if (!session) {
    return false;
  }

  const previousKey = pbkdf2Sync(previousPassword, normalized, KDF_ITERATIONS, 32, "sha256");
  const userKey = decryptBitwarden(session.encryptedKey, stretchMasterKey(previousKey));
  const nextKey = pbkdf2Sync(password, normalized, KDF_ITERATIONS, 32, "sha256");
  const changed = await postJson(
    "/api/accounts/password",
    {
      masterPasswordHash: previousHash,
      newMasterPasswordHash: body.masterPasswordHash,
      key: encryptBitwarden(userKey, stretchMasterKey(nextKey)),
    },
    session.accessToken
  );
  return changed.ok;
}

function stretchMasterKey(masterKey: Buffer) {
  return Buffer.concat([hkdfExpand(masterKey, "enc", 32), hkdfExpand(masterKey, "mac", 32)]);
}

/** Bitwarden uses HKDF-Expand with the master key as the PRK. It does not run Extract. */
function hkdfExpand(prk: Buffer, info: string, length: number) {
  const blocks: Buffer[] = [];
  let previous = Buffer.alloc(0);
  let counter = 1;
  while (Buffer.concat(blocks).length < length) {
    previous = createHmac("sha256", prk)
      .update(previous)
      .update(info)
      .update(Buffer.from([counter]))
      .digest();
    blocks.push(previous);
    counter += 1;
  }
  return Buffer.concat(blocks).subarray(0, length);
}

function encryptBitwarden(plain: Buffer, key: Buffer) {
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-cbc", key.subarray(0, 32), iv);
  const cipherText = Buffer.concat([cipher.update(plain), cipher.final()]);
  const mac = createHmac("sha256", key.subarray(32, 64)).update(iv).update(cipherText).digest();
  return `2.${iv.toString("base64")}|${cipherText.toString("base64")}|${mac.toString("base64")}`;
}

async function vaultwardenLogin(email: string, masterPasswordHash: string) {
  const response = await fetch(`${vaultwardenApiBaseUrl()}/identity/connect/token`, {
    method: "POST",
    signal: AbortSignal.timeout(4000),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "password",
      username: email,
      password: masterPasswordHash,
      scope: "api offline_access",
      client_id: "web",
      deviceType: "9",
      deviceIdentifier: "acrossflare-web",
      deviceName: "acrossflare",
    }),
  });
  if (!response.ok) {
    return null;
  }
  const body = (await response.json()) as { access_token?: string; Key?: string };
  if (!body.access_token || !body.Key) {
    return null;
  }
  return { accessToken: body.access_token, encryptedKey: body.Key };
}

async function postJson(path: string, body: unknown, accessToken?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  const response = await fetch(`${vaultwardenApiBaseUrl()}${path}`, {
    method: "POST",
    signal: AbortSignal.timeout(4000),
    headers,
    body: JSON.stringify(body),
  });
  return { ok: response.ok, status: response.status };
}
