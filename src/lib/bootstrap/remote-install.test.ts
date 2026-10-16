import { describe, expect, it } from "vitest";
import { buildRemoteInstallScript } from "@/lib/bootstrap/remote-install";

describe("buildRemoteInstallScript", () => {
  it("embeds panel ports and refuses to leave placeholders empty", () => {
    const script = buildRemoteInstallScript({
      panelUser: "afadmin",
      panelPassword: "s3cret!",
      panelPort: 2053,
      vlessPort: 443,
    });
    expect(script).toContain("acrossflare-3xui");
    expect(script).toContain("2053:2053");
    expect(script).toContain("443:443");
    expect(script).toContain("AF_BOOTSTRAP_PANEL_READY");
    expect(script).toContain("afadmin");
  });
});
