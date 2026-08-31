import { describe, expect, it } from "vitest";
import {
  buildVlessYaml,
  buildVlessYamlFromNodes,
  karingDeepLink,
  pickHostsForYaml,
  syncthingFolderId,
  vaultUserId,
  xuiClientEmail,
  yamlUrlFor,
  type YamlNode,
} from "@/lib/provision/build";
import { VLESS_CLIENT_FLOW } from "@/lib/provision/reality";
import { NodeRole } from "@prisma/client";
import { BACKUP_ANNOUNCE, backupAnnounce, karingSubscriptionHeaders, withBackupNotice } from "@/lib/provision/subscription";

const realityNode = (ddns: string, role: NodeRole): YamlNode => ({
  ddns,
  role,
  vlessPort: 443,
  realityPublicKey: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  realityShortId: "0123456789",
  realityServerName: "www.microsoft.com",
  realityFingerprint: "chrome",
});

describe("provision/build", () => {
  it("builds a subscription URL and Karing deeplink", () => {
    const url = yamlUrlFor("abc", "https://acrossflare.com/");
    expect(url).toBe("https://acrossflare.com/api/v1/subscription/abc");
    expect(karingDeepLink(url)).toContain("karing://install-config?url=");
  });

  it("emits REALITY VLESS yaml with the backup dashboard notice", () => {
    const yaml = buildVlessYaml([realityNode("node-tokyo.acrossflare.com", NodeRole.BANDWAGON)], "uuid-1");
    expect(yaml).toContain("type: vless");
    expect(yaml).toContain("server: node-tokyo.acrossflare.com");
    expect(yaml).toContain("uuid: uuid-1");
    expect(yaml).toContain("network: tcp");
    expect(yaml).toContain(`flow: ${VLESS_CLIENT_FLOW}`);
    expect(yaml).toContain("reality-opts:");
    expect(yaml).toContain("public-key:");
    expect(yaml).toContain("servername: www.microsoft.com");
    expect(yaml).toContain("client-fingerprint: chrome");
    expect(yaml).toContain("#profile-web-page-url: https://acrossflare.com/dashboard");
  });

  it("falls back to legacy WS yaml when REALITY fields are missing", () => {
    const yaml = buildVlessYaml([{ ddns: "node-tokyo.acrossflare.com", role: NodeRole.BANDWAGON }], "uuid-1");
    expect(yaml).toContain("network: ws");
    expect(yaml).toContain("path: /vless");
  });

  it("derives x-ui, Vaultwarden, and Syncthing ids from a subscription id", () => {
    expect(xuiClientEmail("clxyz1234567890ab")).toMatch(/^af_/);
    expect(vaultUserId("clxyz1234567890ab")).toMatch(/^af_/);
    expect(syncthingFolderId("clxyz1234567890ab")).toMatch(/^af-/);
  });

  it("prefers bandwagon nodes unless failover is active", () => {
    const nodes = [
      realityNode("node-la-b.acrossflare.com", NodeRole.BANDWAGON),
      realityNode("node-la-rn.acrossflare.com", NodeRole.RACKNERD),
    ];
    expect(pickHostsForYaml(nodes, false)).toEqual(["node-la-b.acrossflare.com"]);
    expect(pickHostsForYaml(nodes, true)).toEqual(["node-la-rn.acrossflare.com"]);
  });

  it("builds yaml from node roles and failover state", () => {
    const yaml = buildVlessYamlFromNodes(
      [
        realityNode("node-la-b.acrossflare.com", NodeRole.BANDWAGON),
        realityNode("node-la-rn.acrossflare.com", NodeRole.RACKNERD),
      ],
      "uuid-1",
      true
    );
    expect(yaml).toContain("node-la-rn.acrossflare.com");
    expect(yaml).not.toContain("node-la-b.acrossflare.com");
    expect(yaml).toContain("reality-opts:");
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
