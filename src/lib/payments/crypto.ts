import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export function hmacSha256Hex(secret: string, payload: string) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function hmacSha256Base64(secret: Buffer, payload: string) {
  return createHmac("sha256", secret).update(payload).digest("base64");
}

export function md5Hex(payload: string) {
  return createHash("md5").update(payload).digest("hex");
}

export function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) {
    return false;
  }

  return timingSafeEqual(a, b);
}

export function anySafeEqual(expected: string, candidates: string[]) {
  return candidates.some((candidate) => safeEqual(expected, candidate));
}

export function decodeStandardWebhookSecret(secret: string) {
  if (secret.startsWith("whsec_")) {
    return Buffer.from(secret.slice("whsec_".length), "base64");
  }

  return Buffer.from(secret, "utf8");
}

export function isFreshTimestamp(timestampSec: number, toleranceSec: number, nowSec = Math.floor(Date.now() / 1000)) {
  return Math.abs(nowSec - timestampSec) <= toleranceSec;
}
