import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  SIGNED_IN_COOKIE,
  SIGNED_IN_COOKIE_VALUE,
  sessionCookieOptions,
} from "@/lib/auth-cookies";
import { PRIVATE_NO_STORE } from "@/lib/http-cache";

export async function GET() {
  const user = await getCurrentUser();
  const response = NextResponse.json(
    { user },
    {
      headers: {
        "Cache-Control": PRIVATE_NO_STORE,
      },
    }
  );
  const base = sessionCookieOptions();
  if (user) {
    response.cookies.set(SIGNED_IN_COOKIE, SIGNED_IN_COOKIE_VALUE, { ...base, httpOnly: false });
  } else {
    response.cookies.set(SIGNED_IN_COOKIE, "", { ...base, httpOnly: false, maxAge: 0 });
  }
  return response;
}
