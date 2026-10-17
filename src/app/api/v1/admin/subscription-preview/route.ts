import { NextResponse } from "next/server";
import { loadOwnSubscriptionPreview } from "@/lib/admin-subscription-preview";
import { requireAdmin } from "@/lib/admin-auth";
import type { PublicServiceId } from "@/lib/public-service";

export const dynamic = "force-dynamic";

const SERVICES = new Set<PublicServiceId>(["standard", "hybrid", "workspace"]);

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) {
    return auth.response;
  }

  const service = new URL(request.url).searchParams.get("service");
  if (!service || !SERVICES.has(service as PublicServiceId)) {
    return NextResponse.json({ error: "invalid_service" }, { status: 400 });
  }

  const preview = await loadOwnSubscriptionPreview(auth.user.id, service as PublicServiceId);
  if (!preview) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json(preview, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
