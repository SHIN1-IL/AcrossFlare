import { describe, expect, it } from "vitest";
import { nodeWiring, panelHostname } from "@/lib/provision/node-wiring";

describe("nodeWiring", () => {
  it("flags seed passwords and RFC1918 hosts as placeholders", () => {
    expect(nodeWiring({ host: "203.0.113.10", password: "seed-only" })).toBe("placeholder");
    expect(nodeWiring({ host: "10.0.0.22", password: "real" })).toBe("placeholder");
    expect(nodeWiring({ host: "192.168.1.8", password: "real" })).toBe("placeholder");
    expect(nodeWiring({ host: "203.0.113.44", password: "real" })).toBe("placeholder");
  });

  it("treats loopback and docker host as local panels", () => {
    expect(nodeWiring({ host: "127.0.0.1", password: "real" })).toBe("local");
    expect(nodeWiring({ host: "http://host.docker.internal:2053", password: "real" })).toBe("local");
  });

  it("treats public IPs and hostnames as registered panels", () => {
    expect(nodeWiring({ host: "203.113.10.8", password: "real" })).toBe("ready");
    expect(nodeWiring({ host: "https://panel.example.com", password: "real" })).toBe("ready");
  });

  it("strips scheme and port from panel hostnames", () => {
    expect(panelHostname("https://10.0.0.22:2053/app")).toBe("10.0.0.22");
  });
});
