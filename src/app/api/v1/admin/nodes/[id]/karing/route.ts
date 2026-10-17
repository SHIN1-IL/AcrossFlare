import { NextResponse } from "next/server";
import { writeAdminAudit } from "@/lib/admin-audit";
import { requirePermission } from "@/lib/admin-auth";
import { NodeKaringProbeError, issueNodeKaringProbe } from "@/lib/node-karing-probe";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission("nodes");
  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await params;

  try {
    const result = await issueNodeKaringProbe(id);
    await writeAdminAudit({
      actor: auth.user,
      action: "node_karing_probe",
      targetType: "node",
      targetId: id,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof NodeKaringProbeError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }
    throw error;
  }
}
