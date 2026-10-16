import { generateKeyPairSync, randomBytes } from "node:crypto";

function b64urlToStd(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  return Buffer.from(padded, "base64").toString("base64");
}

/** Xray REALITY x25519 keypair (standard base64, matching `xray x25519` shape). */
export function generateRealityKeyPair() {
  const { privateKey, publicKey } = generateKeyPairSync("x25519");
  const privJwk = privateKey.export({ format: "jwk" }) as { d?: string };
  const pubJwk = publicKey.export({ format: "jwk" }) as { x?: string };
  if (!privJwk.d || !pubJwk.x) {
    throw new Error("reality_keygen_failed");
  }
  return {
    privateKey: b64urlToStd(privJwk.d),
    publicKey: b64urlToStd(pubJwk.x),
  };
}

export function generateRealityShortId() {
  return randomBytes(4).toString("hex");
}
