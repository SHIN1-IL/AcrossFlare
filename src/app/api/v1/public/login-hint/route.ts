import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { error: "gone" },
    { status: 404, headers: { "Cache-Control": "private, no-store" } }
  );
}
