import { NextResponse } from "next/server";
import { loadAccountSnapshot } from "@/lib/account-from-db";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const account = await loadAccountSnapshot(user.email, user.id);
  return NextResponse.json({ account });
}
