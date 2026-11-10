import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";
import { ensureEsimCatalog } from "@/lib/esim/store";

export async function GET() {
  const auth = await requirePermission("customers");
  if ("response" in auth) {
    return auth.response;
  }

  const catalog = await ensureEsimCatalog();
  return NextResponse.json({
    autoIssue: catalog.settings.autoIssue,
    autoIssueLocked: catalog.settings.autoIssueLocked,
  });
}
