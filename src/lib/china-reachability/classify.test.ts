import { describe, expect, it } from "vitest";
import {
  chinaReachabilityRank,
  classifyChinaReachability,
  customerConnectTarget,
  publicIpv4,
  shouldNotifyChinaBlock,
  tcpProbeSucceeded,
} from "@/lib/china-reachability/classify";

describe("publicIpv4", () => {
  it("reads a public address and skips private ranges", () => {
    expect(publicIpv4("https://203.0.113.10:2053")).toBe("203.0.113.10");
    expect(publicIpv4("10.0.0.22")).toBeNull();
    expect(publicIpv4("192.168.1.4")).toBeNull();
    expect(publicIpv4("127.0.0.1")).toBeNull();
  });
});

describe("customerConnectTarget", () => {
  it("uses the public panel IP, then the ddns name", () => {
    expect(
      customerConnectTarget({ host: "https://203.0.113.10:2053", ddns: "node.example.com", vlessPort: 443 })
    ).toEqual({ host: "203.0.113.10", port: 443 });
    expect(
      customerConnectTarget({ host: "10.1.1.1", ddns: "node.example.com", vlessPort: 8443 })
    ).toEqual({ host: "node.example.com", port: 8443 });
    expect(customerConnectTarget({ host: "10.1.1.1", ddns: "", vlessPort: 443 })).toBeNull();
  });

  it("prefers the relay entry host and port when set", () => {
    expect(
      customerConnectTarget({
        host: "https://203.0.113.10:2053",
        ddns: "node.example.com",
        vlessPort: 443,
        entryHost: "gz-relay.example.com",
        entryPort: 24443,
      })
    ).toEqual({ host: "gz-relay.example.com", port: 24443 });
    expect(
      customerConnectTarget({
        host: "https://203.0.113.10:2053",
        ddns: "node.example.com",
        vlessPort: 443,
        entryHost: "1.2.3.4",
        entryPort: null,
      })
    ).toEqual({ host: "1.2.3.4", port: 443 });
  });
});

describe("classifyChinaReachability", () => {
  it("requires a China sample and an overseas sample", () => {
    expect(tcpProbeSucceeded(1)).toBe(false);
    expect(tcpProbeSucceeded(12000)).toBe(true);
    expect(classifyChinaReachability({ china: [false], overseas: [true], chinaListed: 8 })).toBe("unknown");
    expect(
      classifyChinaReachability({
        china: [false, false, false],
        overseas: [true],
        chinaListed: 8,
      })
    ).toBe("blocked");
    expect(
      classifyChinaReachability({
        china: [true, true, true],
        overseas: [true],
      })
    ).toBe("open");
    expect(
      classifyChinaReachability({
        china: [true, false, false],
        overseas: [true],
      })
    ).toBe("partial");
    expect(
      classifyChinaReachability({
        china: [false, false, false],
        overseas: [false, false],
      })
    ).toBe("down");
  });

  it("notifies only when a node becomes blocked", () => {
    expect(shouldNotifyChinaBlock("open", "blocked")).toBe(true);
    expect(shouldNotifyChinaBlock("unknown", "blocked")).toBe(true);
    expect(shouldNotifyChinaBlock("blocked", "blocked")).toBe(false);
    expect(shouldNotifyChinaBlock("blocked", "open")).toBe(false);
    expect(chinaReachabilityRank("blocked")).toBeLessThan(chinaReachabilityRank("open"));
  });
});
