import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("origin deploy typecheck gate", () => {
  it("runs a fresh typecheck before the VPS password prompt and SSH", () => {
    const root = process.cwd();
    const script = readFileSync(path.join(root, "infra/scripts/deploy-from-mac.sh"), "utf8");
    const typecheck = script.indexOf("npm run typecheck");
    const password = script.indexOf("osascript");
    const ssh = script.indexOf("spawn bash");
    const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as {
      scripts: { typecheck: string };
    };

    expect(typecheck).toBeGreaterThan(-1);
    expect(password).toBeGreaterThan(typecheck);
    expect(ssh).toBeGreaterThan(typecheck);
    expect(pkg.scripts.typecheck).toContain("tsc --noEmit --incremental false");
    expect(pkg.scripts.typecheck).toContain("tsconfig.typecheck.json");
  });
});
