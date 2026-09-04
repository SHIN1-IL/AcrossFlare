import { afterEach, describe, expect, it, vi } from "vitest";
import { purgeCloudflareMarketingCache } from "@/lib/cloudflare-purge";

describe("purgeCloudflareMarketingCache", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("skips when credentials are missing", async () => {
    vi.stubEnv("CLOUDFLARE_ZONE_ID", "");
    vi.stubEnv("CLOUDFLARE_API_TOKEN", "");
    const result = await purgeCloudflareMarketingCache(["https://acrossflare.com/en"]);
    expect(result).toEqual({
      ok: true,
      purged: 0,
      skipped: true,
      reason: "CLOUDFLARE_ZONE_ID / CLOUDFLARE_API_TOKEN unset",
    });
  });

  it("batches purge requests", async () => {
    vi.stubEnv("CLOUDFLARE_ZONE_ID", "zone-1");
    vi.stubEnv("CLOUDFLARE_API_TOKEN", "token-1");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const urls = Array.from({ length: 35 }, (_, i) => `https://acrossflare.com/en/p${i}`);
    const result = await purgeCloudflareMarketingCache(urls);

    expect(result).toEqual({ ok: true, purged: 35 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    const secondBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(firstBody.files).toHaveLength(30);
    expect(secondBody.files).toHaveLength(5);
  });
});
