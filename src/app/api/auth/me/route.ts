import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { PRIVATE_NO_STORE } from "@/lib/http-cache";

export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json(
    { user },
    {
      headers: {
        "Cache-Control": PRIVATE_NO_STORE,
      },
    }
  );
}
