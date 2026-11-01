import { NextResponse } from "next/server";
import { writeAdminAudit } from "@/lib/admin-audit";
import { AdminActionError, setNodeSpare } from "@/lib/admin-actions";
import { requirePermission } from "@/lib/admin-auth";
import { isProductId } from "@/lib/plans";

export async function POST(request: Request) {
  const auth = await requirePermission("nodes");
  if ("response" in auth) {
    return auth.response;
  }

  const body = (await request.json().catch(() => null)) as
    | { product?: string; nodeId?: string; enabled?: boolean }
    | null;

  if (!body || !isProductId(body.product) || !body.nodeId || typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "required" }, { status: 400 });
  }

  try {
    const result = await setNodeSpare({
      product: body.product,
      nodeId: body.nodeId,
      enabled: body.enabled,
    });
    await writeAdminAudit({
      actor: auth.user,
      action: body.enabled ? "spare" : "spare-restore",
      targetType: "node",
      targetId: body.nodeId,
      meta: { nodeId: body.nodeId, enabled: body.enabled, total: result.total },
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AdminActionError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }

    throw error;
  }
}
