import { NextResponse } from "next/server";
import { getAuthUser, type AuthUser } from "@/lib/auth";

export async function requireAdmin(): Promise<{ user: AuthUser } | { response: NextResponse }> {
  const user = await getAuthUser();
  if (!user) {
    return { response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }

  if (user.role !== "ADMIN") {
    return { response: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  }

  return { user };
}
