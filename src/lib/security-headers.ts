/**
 * Response headers for the public site.
 *
 * HSTS is apex-only. `includeSubDomains` would force HTTPS on DNS-only
 * `node-*.acrossflare.com` panel hosts that are not part of this origin.
 * Do not add `preload`.
 *
 * CSP allows Next inline bootstrap scripts and the PortOne browser SDK
 * (script + iframe + API on iamport/portone hosts). `form-action` and
 * `frame-src` stay on https so a new PG host does not blank checkout.
 * `unsafe-eval` is omitted: the current PortOne SDK does not use it.
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self' https:",
  "script-src 'self' 'unsafe-inline' https://cdn.portone.io https://static.cloudflareinsights.com https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  "frame-src 'self' https:",
  "worker-src 'self' blob:",
].join("; ");

export const HSTS_VALUE = "max-age=31536000";

export const BASE_SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
] as const;

export const PRODUCTION_SECURITY_HEADERS = [
  ...BASE_SECURITY_HEADERS,
  { key: "Strict-Transport-Security", value: HSTS_VALUE },
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
] as const;

export function securityHeadersForRuntime(nodeEnv: string | undefined) {
  return nodeEnv === "production" ? PRODUCTION_SECURITY_HEADERS : BASE_SECURITY_HEADERS;
}
