import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/admin-auth";
import { AdminActionError } from "@/lib/admin-actions";
import { getMarginSnapshot } from "@/lib/margin-data";
import { currentMonthKey, parseMonthKey } from "@/lib/margin";

export async function GET(request: Request) {
  const auth = await requireOwner();
  if ("response" in auth) {
    return auth.response;
  }

  const month = parseMonthKey(new URL(request.url).searchParams.get("month")) ?? currentMonthKey();
  try {
    const margin = await getMarginSnapshot(month);
    return NextResponse.json(margin, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof AdminActionError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }
    throw error;
  }
}
