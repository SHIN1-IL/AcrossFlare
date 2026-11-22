import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";
import { isChinaCheckRunning, startChinaReachability } from "@/lib/china-reachability/run";

export async function POST() {
  const auth = await requirePermission("nodes");
  if ("response" in auth) {
    return auth.response;
  }

  startChinaReachability();
  return NextResponse.json(
    { running: isChinaCheckRunning() },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
