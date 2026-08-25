import { vaultwardenAdminToken, vaultwardenApiBaseUrl } from "@/lib/provision/config";

export class VaultwardenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VaultwardenError";
  }
}

export async function inviteVaultwardenUser(email: string) {
  const token = vaultwardenAdminToken();
  if (!token) {
    return;
  }

  const response = await fetch(`${vaultwardenApiBaseUrl()}/admin/invite`, {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok && response.status !== 409) {
    throw new VaultwardenError(await errorMessage(response, "vaultwarden_invite_failed"));
  }
}

async function errorMessage(response: Response, fallback: string) {
  const body = await response.text().catch(() => "");
  return body.slice(0, 180) || `${fallback}:${response.status}`;
}
