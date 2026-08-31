import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/admin-auth";
import { getOpsHealth } from "@/lib/admin-ops-health";

export async function GET() {
  const auth = await requireOwner();
  if ("response" in auth) {
    return auth.response;
  }

  return NextResponse.json(await getOpsHealth());
}
