import { generateKeyPairSync, randomBytes } from "node:crypto";
import { realityKeyForClient } from "@/lib/provision/reality";

/** Xray REALITY x25519 keypair (`xray x25519`: raw URL-safe base64, no padding). */
export function generateRealityKeyPair() {
  const { privateKey, publicKey } = generateKeyPairSync("x25519");
  const privJwk = privateKey.export({ format: "jwk" }) as { d?: string };
  const pubJwk = publicKey.export({ format: "jwk" }) as { x?: string };
  const privateEncoded = realityKeyForClient(privJwk.d);
  const publicEncoded = realityKeyForClient(pubJwk.x);
  if (privateEncoded.length !== 43 || publicEncoded.length !== 43) {
    throw new Error("reality_keygen_failed");
  }
  return {
    privateKey: privateEncoded,
    publicKey: publicEncoded,
  };
}

export function generateRealityShortId() {
  return randomBytes(4).toString("hex");
}
