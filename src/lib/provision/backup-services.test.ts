import { afterEach, describe, expect, it, vi } from "vitest";
import { vaultwardenBaseUrl } from "@/lib/provision/config";
import { ensureSyncthingFolder, SyncthingError } from "@/lib/provision/syncthing";
import {
  inviteVaultwardenUser,
  issueVaultwardenBackup,
  resetVaultwardenAdminSession,
  VaultwardenError,
} from "@/lib/provision/vaultwarden";

const originalVaultToken = process.env.VAULTWARDEN_ADMIN_TOKEN;
const originalSyncthingKey = process.env.SYNCTHING_API_KEY;

afterEach(() => {
  vi.unstubAllGlobals();
  resetVaultwardenAdminSession();
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

  it("signs into the admin session when the token header is rejected", async () => {
    process.env.VAULTWARDEN_ADMIN_TOKEN = "vault-token";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("unauthorized", { status: 401 }))
      .mockResolvedValueOnce(
        new Response(null, {
          status: 200,
          headers: { "set-cookie": "VW_ADMIN=admin-jwt; Path=/admin; HttpOnly" },
        })
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(inviteVaultwardenUser("customer@example.com")).resolves.toBe(true);
    expect(String(fetchMock.mock.calls[1]?.[0])).toMatch(/\/admin\/$/);
    expect(fetchMock.mock.calls[2]?.[1]?.headers?.get?.("Cookie") ?? fetchMock.mock.calls[2]?.[1]?.headers?.Cookie).toBe(
      "VW_ADMIN=admin-jwt"
    );
  });

  it("issues the vault backup for the homepage email", async () => {
    process.env.VAULTWARDEN_ADMIN_TOKEN = "vault-token";
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(issueVaultwardenBackup("Person@Example.com")).resolves.toEqual({
      vaultUrl: vaultwardenBaseUrl(),
      vaultUser: "person@example.com",
    });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/admin/invite");
  });

  it("does not issue a vault backup when the admin token is missing", async () => {
    delete process.env.VAULTWARDEN_ADMIN_TOKEN;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(issueVaultwardenBackup("person@example.com")).rejects.toThrow(
      "vaultwarden_not_configured"
    );
    expect(fetchMock).not.toHaveBeenCalled();
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
