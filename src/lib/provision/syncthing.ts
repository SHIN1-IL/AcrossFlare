import { syncthingApiBaseUrl, syncthingApiKey } from "@/lib/provision/config";

export class SyncthingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SyncthingError";
  }
}

export async function ensureSyncthingFolder(input: { folderId: string; label: string }) {
  const apiKey = syncthingApiKey();
  if (!apiKey) {
    return;
  }

  const response = await fetch(
    `${syncthingApiBaseUrl()}/rest/config/folders/${encodeURIComponent(input.folderId)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        id: input.folderId,
        label: input.label,
        path: `/var/syncthing/users/${input.folderId}`,
        type: "sendreceive",
        rescanIntervalS: 3600,
        fsWatcherEnabled: true,
      }),
    }
  );

  if (!response.ok && response.status !== 409) {
    throw new SyncthingError(await errorMessage(response, "syncthing_folder_failed"));
  }
}

async function errorMessage(response: Response, fallback: string) {
  const body = await response.text().catch(() => "");
  return body.slice(0, 180) || `${fallback}:${response.status}`;
}
