import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

import { getCurrentUser } from "@/lib/auth";
import { PRIVATE_NO_STORE } from "@/lib/http-cache";
import { GET } from "./route";

describe("GET /api/auth/me", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
  });

  it("never lets a shared cache store the session", async () => {
    const response = await GET();
    expect(response.headers.get("Cache-Control")).toBe(PRIVATE_NO_STORE);
    await expect(response.json()).resolves.toEqual({ user: null });
  });

  it("expires the presence cookie when nobody is signed in", async () => {
    const response = await GET();
    const cookies =
      typeof response.headers.getSetCookie === "function"
        ? response.headers.getSetCookie()
        : [response.headers.get("set-cookie") ?? ""];
    expect(cookies.join("\n")).toMatch(/af_signed_in=/);
    expect(cookies.join("\n")).toMatch(/Max-Age=0/i);
  });

  it("sets a non-httpOnly presence cookie when a session exists", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      email: "a@b.c",
      role: "USER",
      permissions: [],
    });
    const response = await GET();
    const cookies =
      typeof response.headers.getSetCookie === "function"
        ? response.headers.getSetCookie()
        : [response.headers.get("set-cookie") ?? ""];
    const header = cookies.join("\n");
    expect(header).toMatch(/af_signed_in=1/);
    expect(header).not.toMatch(/HttpOnly/i);
  });
});
