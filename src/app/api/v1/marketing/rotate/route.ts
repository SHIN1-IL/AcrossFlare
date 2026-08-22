import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { RotateError, rotateMarketingIp } from "@/lib/marketing/rotate";

export async function POST() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const account = await rotateMarketingIp(user.id, user.email);
    return NextResponse.json({ account });
  } catch (error) {
    if (error instanceof RotateError) {
      const status = error.code === "locked" ? 409 : error.code === "not_found" ? 404 : 400;
      return NextResponse.json(
        { error: error.code, lockedUntil: error.lockedUntil },
        { status }
      );
    }

    throw error;
  }
}
