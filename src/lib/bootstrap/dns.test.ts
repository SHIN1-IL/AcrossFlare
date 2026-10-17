import { afterEach, describe, expect, it, vi } from "vitest";
import { dnsRecordAlreadySet, upsertNodeARecord } from "@/lib/bootstrap/dns";
import { resolve4 } from "node:dns/promises";

vi.mock("node:dns/promises", () => ({
  resolve4: vi.fn(),
}));

describe("upsertNodeARecord", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("skips when Cloudflare creds are missing", async () => {
    vi.stubEnv("CLOUDFLARE_ZONE_ID", "");
    vi.stubEnv("CLOUDFLARE_API_TOKEN", "");
    const result = await upsertNodeARecord({ fqdn: "node-x.acrossflare.com", ipv4: "1.2.3.4" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.skipped).toBe(true);
    }
  });

  it("accepts a hostname that already resolves to the VPS address", async () => {
    vi.mocked(resolve4).mockResolvedValue(["74.82.221.67"]);
    await expect(dnsRecordAlreadySet("node-tokyo.acrossflare.com", "74.82.221.67")).resolves.toBe(true);
    vi.mocked(resolve4).mockResolvedValue(["1.2.3.4"]);
    await expect(dnsRecordAlreadySet("node-tokyo.acrossflare.com", "74.82.221.67")).resolves.toBe(false);
    vi.mocked(resolve4).mockRejectedValue(new Error("ENOTFOUND"));
    await expect(dnsRecordAlreadySet("missing.acrossflare.com", "74.82.221.67")).resolves.toBe(false);
  });

  it("rejects non-ipv4", async () => {
    vi.stubEnv("CLOUDFLARE_ZONE_ID", "zone");
    vi.stubEnv("CLOUDFLARE_API_TOKEN", "token");
    const result = await upsertNodeARecord({ fqdn: "node-x.acrossflare.com", ipv4: "not-an-ip" });
    expect(result).toEqual({ ok: false, error: "dns_invalid" });
  });
});
