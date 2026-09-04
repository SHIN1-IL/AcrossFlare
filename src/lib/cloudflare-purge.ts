import { marketingUrls } from "@/lib/marketing-urls";

const PURGE_BATCH = 30;

export type CloudflarePurgeResult =
  | { ok: true; purged: number; skipped?: false }
  | { ok: true; purged: 0; skipped: true; reason: string }
  | { ok: false; error: string };

function cloudflareCreds() {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID?.trim();
  const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!zoneId || !token) {
    return null;
  }
  return { zoneId, token };
}

function appOrigin() {
  return (process.env.APP_URL ?? "https://acrossflare.com").replace(/\/$/, "");
}

async function purgeFiles(zoneId: string, token: string, files: string[]) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ files }),
    }
  );
  const body = (await response.json().catch(() => null)) as {
    success?: boolean;
    errors?: Array<{ message?: string }>;
  } | null;

  if (!response.ok || !body?.success) {
    const detail = body?.errors?.map((item) => item.message).filter(Boolean).join("; ");
    throw new Error(detail || `Cloudflare purge HTTP ${response.status}`);
  }
}

/** Best-effort edge HTML bust. No-ops when CF credentials are unset. */
export async function purgeCloudflareMarketingCache(
  urls: string[] = marketingUrls(appOrigin())
): Promise<CloudflarePurgeResult> {
  const creds = cloudflareCreds();
  if (!creds) {
    return {
      ok: true,
      purged: 0,
      skipped: true,
      reason: "CLOUDFLARE_ZONE_ID / CLOUDFLARE_API_TOKEN unset",
    };
  }

  try {
    let purged = 0;
    for (let i = 0; i < urls.length; i += PURGE_BATCH) {
      const batch = urls.slice(i, i + PURGE_BATCH);
      await purgeFiles(creds.zoneId, creds.token, batch);
      purged += batch.length;
    }
    return { ok: true, purged };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Cloudflare purge failed",
    };
  }
}
