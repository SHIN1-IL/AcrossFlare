import { describe, expect, it } from "vitest";
import { emptyAccount, resolveAccount, scenarioFromEmail } from "@/lib/account";

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

describe("scenarioFromEmail", () => {
  it("does not treat admin accounts as the both-user demo", () => {
    expect(scenarioFromEmail("admin@acrossflare.com")).toBe("unpaid-user");
    expect(resolveAccount("admin@acrossflare.com").global).toBeNull();
    expect(resolveAccount("admin@acrossflare.com").marketing).toBeNull();
    expect(emptyAccount("admin@acrossflare.com").global).toBeNull();
  });

  it("keeps explicit demo users on their seed scenarios", () => {
    expect(scenarioFromEmail("both-user@acrossflare.com")).toBe("both-user");
    expect(resolveAccount("both-user@acrossflare.com").global).not.toBeNull();
    expect(resolveAccount("both-user@acrossflare.com").marketing).not.toBeNull();
  });
});
