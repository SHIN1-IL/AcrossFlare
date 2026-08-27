import { NextResponse } from "next/server";
import { writeAdminAudit } from "@/lib/admin-audit";
import { AdminActionError, removeAdminNode } from "@/lib/admin-actions";
import { requirePermission } from "@/lib/admin-auth";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("nodes");
  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await params;

  try {
    await removeAdminNode(id);
    await writeAdminAudit({
      actor: auth.user,
      action: "node_delete",
      targetType: "node",
      targetId: id,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AdminActionError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }

    throw error;
  }
}
