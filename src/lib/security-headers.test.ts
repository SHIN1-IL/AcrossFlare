import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CONTENT_SECURITY_POLICY,
  HSTS_VALUE,
  securityHeadersForRuntime,
} from "@/lib/security-headers";

describe("security headers", () => {
  it("omits HSTS and CSP outside production so local http dev keeps working", () => {
    const dev = securityHeadersForRuntime("development");
    expect(dev.map((header) => header.key)).not.toContain("Strict-Transport-Security");
    expect(dev.map((header) => header.key)).not.toContain("Content-Security-Policy");
    expect(dev.map((header) => header.key)).toContain("X-Content-Type-Options");
  });

  it("locks only the apex host and still allows PortOne checkout", () => {
    const prod = securityHeadersForRuntime("production");
    const hsts = prod.find((header) => header.key === "Strict-Transport-Security");
    const csp = prod.find((header) => header.key === "Content-Security-Policy");
    expect(hsts?.value).toBe(HSTS_VALUE);
    expect(hsts?.value).not.toMatch(/includeSubDomains|preload/);
    expect(csp?.value).toBe(CONTENT_SECURITY_POLICY);
    expect(csp?.value).toContain("https://cdn.portone.io");
    expect(csp?.value).toContain("frame-src 'self' https:");
    expect(csp?.value).toContain("form-action 'self' https:");
    expect(csp?.value).not.toContain("unsafe-eval");
  });

  it("keeps the Caddy policy identical and redirects only www to the apex", () => {
    const caddy = readFileSync("infra/caddy/Caddyfile", "utf8");
    expect(caddy).toContain(`Content-Security-Policy "${CONTENT_SECURITY_POLICY}"`);
    expect(caddy).toContain(`Strict-Transport-Security "${HSTS_VALUE}"`);
    const hstsLines = caddy.split("\n").filter((line) => line.includes("Strict-Transport-Security"));
    expect(hstsLines.length).toBeGreaterThan(0);
    for (const line of hstsLines) {
      expect(line).not.toMatch(/includeSubDomains|preload/);
    }
    expect(caddy).toContain("www.acrossflare.com {");
    expect(caddy).toContain("redir https://acrossflare.com{uri} permanent");
    expect(caddy).not.toMatch(/vault\.acrossflare\.com[\s\S]*redir https:\/\/acrossflare\.com/);
  });
});
