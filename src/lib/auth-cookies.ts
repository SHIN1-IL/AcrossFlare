export const SESSION_COOKIE = "af_session";
/** Non-httpOnly flag only. Never put email, token, or role here. */
export const SIGNED_IN_COOKIE = "af_signed_in";
export const SIGNED_IN_COOKIE_VALUE = "1";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export function sessionCookieOptions() {
  return {
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  };
}
