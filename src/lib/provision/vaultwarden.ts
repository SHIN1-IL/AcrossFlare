import { vaultwardenAdminToken, vaultwardenApiBaseUrl, vaultwardenBaseUrl } from "@/lib/provision/config";

export class VaultwardenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VaultwardenError";
  }
}

let adminCookie: { header: string; expiresAt: number } | null = null;

export function resetVaultwardenAdminSession() {
  adminCookie = null;
}

export async function inviteVaultwardenUser(email: string): Promise<boolean> {
  const response = await vaultwardenAdminFetch("/invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!response) {
    return false;
  }

  if (!response.ok && response.status !== 409) {
    throw new VaultwardenError(await errorMessage(response, "vaultwarden_invite_failed"));
  }

  return true;
}

/** Invites the homepage email so payment can open the same Vaultwarden login. */
export async function issueVaultwardenBackup(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !vaultwardenAdminToken()) {
    throw new VaultwardenError(normalized ? "vaultwarden_not_configured" : "vaultwarden_invite_failed");
  }

  const invited = await inviteVaultwardenUser(normalized);
  if (!invited) {
    throw new VaultwardenError("vaultwarden_invite_failed");
  }

  return {
    vaultUrl: vaultwardenBaseUrl(),
    vaultUser: normalized,
  };
}

/** Removes a vault account so it can be registered again with the homepage password. */
export async function deleteVaultwardenUser(email: string) {
  const lookup = await vaultwardenAdminFetch(`/users/by-mail/${encodeURIComponent(email)}`);
  if (!lookup) {
    return false;
  }
  if (lookup.status === 404) {
    return true;
  }
  if (!lookup.ok) {
    return false;
  }

  const body = (await lookup.json().catch(() => null)) as { Id?: unknown; id?: unknown } | null;
  const id = typeof body?.Id === "string" ? body.Id : typeof body?.id === "string" ? body.id : "";
  if (!id) {
    return false;
  }

  const removed = await vaultwardenAdminFetch(`/users/${encodeURIComponent(id)}/delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  return Boolean(removed?.ok);
}

export async function vaultwardenAdminFetch(path: string, init: RequestInit = {}) {
  const token = vaultwardenAdminToken();
  if (!token) {
    return null;
  }

  const first = await adminFetch(path, init, token, null);
  if (first.status !== 401) {
    return first;
  }

  const cookie = await ensureAdminCookie(token);
  if (!cookie) {
    return first;
  }
  return adminFetch(path, init, token, cookie);
}

async function adminFetch(path: string, init: RequestInit, token: string, cookie: string | null) {
  const headers = new Headers(init.headers);
  headers.set("Authorization", token);
  if (cookie) {
    headers.set("Cookie", cookie);
  }
  return fetch(`${vaultwardenApiBaseUrl()}/admin${path}`, {
    ...init,
    headers,
    redirect: "manual",
    signal: init.signal ?? AbortSignal.timeout(4000),
  });
}

async function ensureAdminCookie(token: string) {
  if (adminCookie && adminCookie.expiresAt > Date.now()) {
    return adminCookie.header;
  }

  const response = await fetch(`${vaultwardenApiBaseUrl()}/admin/`, {
    method: "POST",
    redirect: "manual",
    signal: AbortSignal.timeout(4000),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }),
  });
  const header = readAdminCookie(response);
  if (!header) {
    return null;
  }
  adminCookie = { header, expiresAt: Date.now() + 10 * 60 * 1000 };
  return header;
}

function readAdminCookie(response: Response) {
  const combined =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie().join("\n")
      : (response.headers.get("set-cookie") ?? "");
  const match = /VW_ADMIN=([^;\s]+)/.exec(combined);
  return match ? `VW_ADMIN=${match[1]}` : null;
}

async function errorMessage(response: Response, fallback: string) {
  const body = await response.text().catch(() => "");
  return body.slice(0, 180) || `${fallback}:${response.status}`;
}
