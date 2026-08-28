import { afterEach, describe, expect, it, vi } from "vitest";
import { getSession, hydrateSession, refreshSession } from "@/lib/session";

afterEach(() => {
  hydrateSession(null);
  vi.unstubAllGlobals();
});

describe("refreshSession", () => {
  it("bypasses HTTP caches when reading the cookie session", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ user: { email: "a@b.c", role: "USER", permissions: [] } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await refreshSession();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/me",
      expect.objectContaining({ cache: "no-store", credentials: "include" })
    );
    expect(getSession()?.email).toBe("a@b.c");
  });

  it("keeps the current session when the lookup fails", async () => {
    hydrateSession({ email: "a@b.c", role: "USER", permissions: [] });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    await expect(refreshSession()).resolves.toEqual({
      email: "a@b.c",
      role: "USER",
      permissions: [],
    });
  });
});
