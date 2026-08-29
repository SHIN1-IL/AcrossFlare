import { describe, expect, it } from "vitest";
import {
  SESSION_COOKIE,
  SIGNED_IN_COOKIE,
  SIGNED_IN_COOKIE_VALUE,
  sessionCookieOptions,
} from "@/lib/auth-cookies";

describe("auth cookies", () => {
  it("keeps the session token httpOnly and the presence flag identity-free", () => {
    expect(SESSION_COOKIE).toBe("af_session");
    expect(SIGNED_IN_COOKIE).toBe("af_signed_in");
    expect(SIGNED_IN_COOKIE_VALUE).toBe("1");
    expect(sessionCookieOptions()).toMatchObject({ path: "/", sameSite: "lax" });
  });
});
