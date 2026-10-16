import { NextResponse } from "next/server";
import { writeAdminAudit } from "@/lib/admin-audit";
import { AdminActionError } from "@/lib/admin-actions";
import { requireOwner } from "@/lib/admin-auth";
import { updateNodeMonthlyCosts } from "@/lib/margin-data";
import { parseCostUpdates } from "@/lib/margin";

export async function PATCH(request: Request) {
  const auth = await requireOwner();
  if ("response" in auth) {
    return auth.response;
  }

  const rows = parseCostUpdates(await request.json().catch(() => null));
  if (!rows) {
    return NextResponse.json({ error: "required" }, { status: 400 });
  }

  try {
    const nodes = await updateNodeMonthlyCosts(rows);
    await writeAdminAudit({
      actor: auth.user,
      action: "margin_cost_update",
      targetType: "margin",
      targetId: "nodes",
      meta: { nodes: rows },
    });
    return NextResponse.json({ ok: true, names: nodes.map((node) => node.name) });
  } catch (error) {
    if (error instanceof AdminActionError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }
    throw error;
  }
}
