import { afterEach, describe, expect, it, vi } from "vitest";
import { ensureSyncthingFolder, SyncthingError } from "@/lib/provision/syncthing";
import { inviteVaultwardenUser, VaultwardenError } from "@/lib/provision/vaultwarden";

const originalVaultToken = process.env.VAULTWARDEN_ADMIN_TOKEN;
const originalSyncthingKey = process.env.SYNCTHING_API_KEY;

afterEach(() => {
  vi.unstubAllGlobals();
  restoreEnv("VAULTWARDEN_ADMIN_TOKEN", originalVaultToken);
  restoreEnv("SYNCTHING_API_KEY", originalSyncthingKey);
});

describe("backup provisioning services", () => {
  it("reports unavailable services when live credentials are missing", async () => {
    delete process.env.VAULTWARDEN_ADMIN_TOKEN;
    delete process.env.SYNCTHING_API_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(inviteVaultwardenUser("customer@example.com")).resolves.toBe(false);
    await expect(
      ensureSyncthingFolder({ folderId: "af-customer", label: "customer@example.com" })
    ).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports successful creation and treats existing resources as ready", async () => {
    process.env.VAULTWARDEN_ADMIN_TOKEN = "vault-token";
    process.env.SYNCTHING_API_KEY = "sync-key";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 409 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(inviteVaultwardenUser("customer@example.com")).resolves.toBe(true);
    await expect(
      ensureSyncthingFolder({ folderId: "af-customer", label: "customer@example.com" })
    ).resolves.toBe(true);
  });

  it("throws service-specific errors for rejected provisioning requests", async () => {
    process.env.VAULTWARDEN_ADMIN_TOKEN = "vault-token";
    process.env.SYNCTHING_API_KEY = "sync-key";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("vault denied", { status: 403 }))
      .mockResolvedValueOnce(new Response("sync denied", { status: 403 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(inviteVaultwardenUser("customer@example.com")).rejects.toBeInstanceOf(
      VaultwardenError
    );
    await expect(
      ensureSyncthingFolder({ folderId: "af-customer", label: "customer@example.com" })
    ).rejects.toBeInstanceOf(SyncthingError);
  });
});

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}
