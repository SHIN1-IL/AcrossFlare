import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { loadAdminHomeSummary, presentAdminHomeSummary } from "@/lib/admin-home-summary";

export async function GET() {
  const auth = await requireAdmin();
  if ("response" in auth) {
    return auth.response;
  }

  return NextResponse.json(presentAdminHomeSummary(await loadAdminHomeSummary(), auth.user.permissions), {
    headers: { "Cache-Control": "private, no-store" },
  });
}
