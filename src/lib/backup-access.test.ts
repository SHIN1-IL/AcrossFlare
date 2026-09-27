import { afterEach, describe, expect, it } from "vitest";
import { assertSameOrigin } from "@/lib/backup-access";
import { BackupStorageError } from "@/lib/backup-storage";

const originalAppUrl = process.env.APP_URL;

afterEach(() => {
  if (originalAppUrl === undefined) {
    delete process.env.APP_URL;
  } else {
    process.env.APP_URL = originalAppUrl;
  }
});

describe("backup upload origin", () => {
  it("accepts the public site when the app sees an internal request URL", () => {
    process.env.APP_URL = "https://acrossflare.com";
    const request = new Request("http://0.0.0.0:3000/api/v1/backup/files", {
      method: "POST",
      headers: { origin: "https://acrossflare.com" },
    });

    expect(() => assertSameOrigin(request)).not.toThrow();
  });

  it("rejects a different site", () => {
    process.env.APP_URL = "https://acrossflare.com";
    const request = new Request("https://acrossflare.com/api/v1/backup/files", {
      method: "POST",
      headers: { origin: "https://evil.example" },
    });

    expect(() => assertSameOrigin(request)).toThrow(BackupStorageError);
  });
});
