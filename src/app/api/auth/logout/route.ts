import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { destroySession, SESSION_COOKIE } from "@/lib/auth";

export async function POST() {
  const cookieStore = await cookies();
  await destroySession(cookieStore.get(SESSION_COOKIE)?.value);
  return NextResponse.json({ ok: true });
}
