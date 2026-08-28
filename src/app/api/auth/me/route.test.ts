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
});
