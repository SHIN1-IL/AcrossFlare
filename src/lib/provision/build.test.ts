import { describe, expect, it } from "vitest";
import {
  buildVlessYaml,
  karingDeepLink,
  nextcloudUserId,
  xuiClientEmail,
  yamlUrlFor,
} from "@/lib/provision/build";

describe("provision/build", () => {
  it("builds a yaml subscription URL and Karing deeplink", () => {
    const url = yamlUrlFor("abc", "https://acrossflare.com/");
    expect(url).toBe("https://acrossflare.com/api/v1/yaml/abc");
    expect(karingDeepLink(url)).toContain("karing://install-config?url=");
  });

  it("emits VLESS yaml for DDNS hosts", () => {
    const yaml = buildVlessYaml(["node-sg.acrossflare.com"], "uuid-1");
    expect(yaml).toContain("type: vless");
    expect(yaml).toContain("server: node-sg.acrossflare.com");
    expect(yaml).toContain("uuid: uuid-1");
    expect(yaml).toContain("path: /vless");
  });

  it("derives x-ui and Nextcloud ids from a subscription id", () => {
    expect(xuiClientEmail("clxyz1234567890ab")).toMatch(/^af_/);
    expect(nextcloudUserId("clxyz1234567890ab")).toMatch(/^af_/);
  });
});
