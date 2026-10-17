import { describe, expect, it } from "vitest";
import { probeExpiresAt, probePanelErrorCode } from "@/lib/node-karing-probe";
import { XuiError } from "@/lib/provision/xui";

describe("node karing probe", () => {
  it("keeps the admin check alive for ten years", () => {
    const expiresAt = probeExpiresAt(new Date("2026-10-17T00:00:00.000Z"));
    expect(expiresAt.toISOString()).toBe("2036-10-17T00:00:00.000Z");
  });

  it("hides panel hosts from the admin error", () => {
    expect(probePanelErrorCode(new XuiError("login_failed:203.0.113.10:2053"))).toBe("panel_unreachable");
    expect(probePanelErrorCode(new XuiError("vless_inbound_missing:node_1"))).toBe("inbound_missing");
    expect(probePanelErrorCode(new Error("panel password is secret"))).toBe("xui_failed");
  });
});
