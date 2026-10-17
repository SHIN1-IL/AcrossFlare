import { NextResponse } from "next/server";
import { loadCustomerSubscriptionPreview } from "@/lib/admin-subscription-preview";
import { requirePermission } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("customers");
  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await params;
  const preview = await loadCustomerSubscriptionPreview(id);
  if (!preview) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json(preview, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
