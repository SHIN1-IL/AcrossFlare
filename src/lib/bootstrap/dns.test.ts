import { afterEach, describe, expect, it, vi } from "vitest";
import { upsertNodeARecord } from "@/lib/bootstrap/dns";

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

  it("rejects non-ipv4", async () => {
    vi.stubEnv("CLOUDFLARE_ZONE_ID", "zone");
    vi.stubEnv("CLOUDFLARE_API_TOKEN", "token");
    const result = await upsertNodeARecord({ fqdn: "node-x.acrossflare.com", ipv4: "not-an-ip" });
    expect(result).toEqual({ ok: false, error: "dns_invalid" });
  });
});
