import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { filterAdminState } from "@/lib/admin-permissions";
import { listAdminState } from "@/lib/admin-data";

export async function GET() {
  const auth = await requireAdmin();
  if ("response" in auth) {
    return auth.response;
  }

  return NextResponse.json(filterAdminState(await listAdminState(), auth.user.permissions));
}
