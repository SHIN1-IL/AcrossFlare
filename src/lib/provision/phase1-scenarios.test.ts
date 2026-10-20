import { describe, expect, it } from "vitest";
import { NodeRole } from "@prisma/client";
import { buildVlessYamlFromNodes, pickHostsForYaml, type YamlNode } from "@/lib/provision/build";
import { karingSubscriptionHeaders } from "@/lib/provision/subscription";

const reality = (ddns: string, role: NodeRole): YamlNode => ({
  ddns,
  role,
  vlessPort: 443,
  realityPublicKey: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  realityShortId: "0123456789",
  realityServerName: "www.microsoft.com",
  realityFingerprint: "chrome",
});

const primary = reality("node-la-b.acrossflare.com", NodeRole.PRIMARY);
const failoverNode = reality("node-la-rn.acrossflare.com", NodeRole.FAILOVER);

describe("phase1 scenarios (typescript parity)", () => {
  it("standard plan under limit keeps PRIMARY nodes", () => {
    const hosts = pickHostsForYaml([primary, failoverNode], false);
    expect(hosts).toEqual(["node-la-b.acrossflare.com"]);
  });

  it("failover switches yaml hosts to FAILOVER", () => {
    const yaml = buildVlessYamlFromNodes([primary, failoverNode], "uuid-1", true);
    expect(yaml).toContain("node-la-rn.acrossflare.com");
    expect(yaml).not.toContain("node-la-b.acrossflare.com");
  });

  it("failover headers leave the quota off so Karing does not treat it as empty", () => {
    const headers = karingSubscriptionHeaders({
      trafficUsedGb: 150,
      trafficLimitGb: null,
      expiresAt: "2030-01-01T00:00:00.000Z",
    });
    expect(headers["subscription-userinfo"]).toContain("total=10995116277760");
  });

  it("blocked subscription headers still expose usage", () => {
    const headers = karingSubscriptionHeaders({
      trafficUsedGb: 150,
      trafficLimitGb: 150,
      expiresAt: "2030-01-01T00:00:00.000Z",
    });
    expect(headers["subscription-userinfo"]).toMatch(/download=\d+/);
    expect(headers["subscription-userinfo"]).toContain("total=161061273600");
  });
});
