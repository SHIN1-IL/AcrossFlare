import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getSession,
  hasSignedInFlag,
  hydrateSession,
  isSessionProbeDone,
  markSessionProbeDone,
  refreshSession,
  resetSessionClientState,
  shouldRefreshSession,
} from "@/lib/session";

afterEach(() => {
  resetSessionClientState();
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

  it("skips origin when no presence cookie and no in-memory session", () => {
    hydrateSession(null);
    vi.stubGlobal("document", { cookie: "" });
    expect(hasSignedInFlag()).toBe(false);
    expect(shouldRefreshSession()).toBe(false);
  });

  it("refreshes only when the presence cookie is set", () => {
    hydrateSession(null);
    vi.stubGlobal("document", { cookie: "af_signed_in=1" });
    expect(hasSignedInFlag()).toBe(true);
    expect(shouldRefreshSession()).toBe(true);
  });

  it("does not treat a lookalike cookie as signed in", () => {
    hydrateSession(null);
    vi.stubGlobal("document", { cookie: "xaf_signed_in=1; theme=dark" });
    expect(hasSignedInFlag()).toBe(false);
    expect(shouldRefreshSession()).toBe(false);
  });

  it("clears the presence cookie when the lookup returns no user", async () => {
    let cookie = "af_signed_in=1";
    vi.stubGlobal("document", {
      get cookie() {
        return cookie;
      },
      set cookie(value: string) {
        cookie = value;
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ user: null }),
      })
    );

    await expect(refreshSession()).resolves.toBeNull();
    expect(hasSignedInFlag()).toBe(false);
  });

  it("marks the client session probe complete once", () => {
    expect(isSessionProbeDone()).toBe(false);
    markSessionProbeDone();
    markSessionProbeDone();
    expect(isSessionProbeDone()).toBe(true);
  });
});
