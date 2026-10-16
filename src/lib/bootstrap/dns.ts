export type DnsUpsertResult =
  | { ok: true; recordId: string; skipped?: false }
  | { ok: true; recordId: ""; skipped: true; reason: string }
  | { ok: false; error: string };

function cloudflareCreds() {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID?.trim();
  const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!zoneId || !token) {
    return null;
  }
  return { zoneId, token };
}

/**
 * Upsert an A record as DNS-only (grey cloud). Never proxied — REALITY/node traffic
 * must not go through Cloudflare orange cloud.
 */
export async function upsertNodeARecord(input: {
  fqdn: string;
  ipv4: string;
}): Promise<DnsUpsertResult> {
  const creds = cloudflareCreds();
  if (!creds) {
    return {
      ok: true,
      recordId: "",
      skipped: true,
      reason: "CLOUDFLARE_ZONE_ID / CLOUDFLARE_API_TOKEN unset",
    };
  }

  const name = input.fqdn.trim().toLowerCase().replace(/\.$/, "");
  const content = input.ipv4.trim();
  if (!name || !/^\d{1,3}(?:\.\d{1,3}){3}$/.test(content)) {
    return { ok: false, error: "dns_invalid" };
  }

  try {
    const listUrl = new URL(
      `https://api.cloudflare.com/client/v4/zones/${creds.zoneId}/dns_records`
    );
    listUrl.searchParams.set("type", "A");
    listUrl.searchParams.set("name", name);

    const listed = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${creds.token}`, "Content-Type": "application/json" },
    });
    const listBody = (await listed.json().catch(() => null)) as {
      success?: boolean;
      result?: Array<{ id: string }>;
      errors?: Array<{ message?: string }>;
    } | null;

    if (!listed.ok || !listBody?.success) {
      const detail = listBody?.errors?.map((item) => item.message).filter(Boolean).join("; ");
      return { ok: false, error: detail || `dns_list_http_${listed.status}` };
    }

    const existingId = listBody.result?.[0]?.id;
    const payload = {
      type: "A",
      name,
      content,
      ttl: 120,
      proxied: false,
    };

    const response = await fetch(
      existingId
        ? `https://api.cloudflare.com/client/v4/zones/${creds.zoneId}/dns_records/${existingId}`
        : `https://api.cloudflare.com/client/v4/zones/${creds.zoneId}/dns_records`,
      {
        method: existingId ? "PUT" : "POST",
        headers: { Authorization: `Bearer ${creds.token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    const body = (await response.json().catch(() => null)) as {
      success?: boolean;
      result?: { id?: string };
      errors?: Array<{ message?: string }>;
    } | null;

    if (!response.ok || !body?.success || !body.result?.id) {
      const detail = body?.errors?.map((item) => item.message).filter(Boolean).join("; ");
      return { ok: false, error: detail || `dns_upsert_http_${response.status}` };
    }

    return { ok: true, recordId: body.result.id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "dns_failed" };
  }
}
