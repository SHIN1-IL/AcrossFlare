import { describe, expect, it } from "vitest";
import { resolveAccount } from "@/lib/account";

describe("resolveAccount workspace", () => {
  it("leaves workspace empty unless the overlay includes it", () => {
    expect(resolveAccount("unpaid-user@acrossflare.com").workspace).toBeNull();
  });

  it("loads Workspace & Custom from extraProducts", () => {
    const account = resolveAccount("ops@acrossflare.com", {
      extraProducts: ["workspace"],
      extraPlanIds: { workspace: "workspace-b" },
    });
    expect(account.workspace?.planId).toBe("workspace-b");
    expect(account.global).toBeNull();
  });
});
