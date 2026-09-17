import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /api/v1/public/login-hint", () => {
  it("does not publish review or owner passwords", async () => {
    const response = await GET();
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(JSON.stringify(body)).not.toMatch(/password|whsec_|12345678/i);
  });
});
