import { describe, expect, it } from "vitest";
import {
  buildVlessYaml,
  karingDeepLink,
  syncthingFolderId,
  vaultUserId,
  xuiClientEmail,
  yamlUrlFor,
} from "@/lib/provision/build";
import { BACKUP_ANNOUNCE, karingSubscriptionHeaders } from "@/lib/provision/subscription";

describe("provision/build", () => {
  it("builds a subscription URL and Karing deeplink", () => {
    const url = yamlUrlFor("abc", "https://acrossflare.com/");
    expect(url).toBe("https://acrossflare.com/api/v1/subscription/abc");
    expect(karingDeepLink(url)).toContain("karing://install-config?url=");
  });

  it("emits VLESS yaml for DDNS hosts with the backup dashboard notice", () => {
    const yaml = buildVlessYaml(["node-sg.acrossflare.com"], "uuid-1");
    expect(yaml).toContain("type: vless");
    expect(yaml).toContain("server: node-sg.acrossflare.com");
    expect(yaml).toContain("uuid: uuid-1");
    expect(yaml).toContain("path: /vless");
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
  it("puts the PWA dashboard URL on Karing metadata headers", () => {
    const headers = karingSubscriptionHeaders({
      trafficUsedGb: 1,
      trafficLimitGb: 150,
      expiresAt: "2026-09-01T00:00:00.000Z",
    });
    expect(headers["profile-web-page-url"]).toBe("https://acrossflare.com/dashboard");
    expect(headers["support-url"]).toBe("https://acrossflare.com/dashboard");
    expect(headers.announce).toBe(BACKUP_ANNOUNCE);
    expect(headers["subscription-userinfo"]).toContain("expire=");
  });
});
