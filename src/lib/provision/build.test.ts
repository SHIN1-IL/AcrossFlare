import { describe, expect, it } from "vitest";
import {
  buildVlessYaml,
  karingDeepLink,
  syncthingFolderId,
  vaultUserId,
  xuiClientEmail,
  yamlUrlFor,
} from "@/lib/provision/build";
import { BACKUP_ANNOUNCE, backupAnnounce, karingSubscriptionHeaders, withBackupNotice } from "@/lib/provision/subscription";

describe("provision/build", () => {
  it("builds a subscription URL and Karing deeplink", () => {
    const url = yamlUrlFor("abc", "https://acrossflare.com/");
    expect(url).toBe("https://acrossflare.com/api/v1/subscription/abc");
    expect(karingDeepLink(url)).toContain("karing://install-config?url=");
  });

  it("emits VLESS yaml for DDNS hosts with the backup dashboard notice", () => {
    const yaml = buildVlessYaml(["node-tokyo.acrossflare.com"], "uuid-1");
    expect(yaml).toContain("type: vless");
    expect(yaml).toContain("server: node-tokyo.acrossflare.com");
    expect(yaml).toContain("uuid: uuid-1");
    expect(yaml).toContain("path: /vless");
    expect(yaml).toContain("#profile-web-page-url: https://acrossflare.com/dashboard");
    expect(yaml).toContain("#support-url: https://acrossflare.com/dashboard");
    expect(yaml).toContain(`#announce: ${BACKUP_ANNOUNCE} https://acrossflare.com/dashboard`);
    expect(yaml).toContain(BACKUP_ANNOUNCE);
    expect(yaml).toContain("https://acrossflare.com/dashboard");
  });

  it("derives x-ui, Vaultwarden, and Syncthing ids from a subscription id", () => {
    expect(xuiClientEmail("clxyz1234567890ab")).toMatch(/^af_/);
    expect(vaultUserId("clxyz1234567890ab")).toMatch(/^af_/);
    expect(syncthingFolderId("clxyz1234567890ab")).toMatch(/^af-/);
  });
});

describe("provision/subscription", () => {
  it("puts the backup dashboard URL on Karing webpage, support, and announce headers", () => {
    const headers = karingSubscriptionHeaders({
      trafficUsedGb: 1,
      trafficLimitGb: 150,
      expiresAt: "2026-09-01T00:00:00.000Z",
    });
    expect(headers["profile-web-page-url"]).toBe("https://acrossflare.com/dashboard");
    expect(headers["support-url"]).toBe("https://acrossflare.com/dashboard");
    expect(headers["announce-url"]).toBe("https://acrossflare.com/dashboard");
    expect(headers.announce).toBe(backupAnnounce("https://acrossflare.com/dashboard"));
    expect(headers["subscription-userinfo"]).toContain("expire=");
  });

  it("does not duplicate Hiddify-style backup comments", () => {
    const once = withBackupNotice("proxies: []\n");
    const twice = withBackupNotice(once);
    expect(twice.split("#profile-web-page-url:").length).toBe(2);
  });
});
