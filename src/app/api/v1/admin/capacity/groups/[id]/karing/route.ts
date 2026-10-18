import { NextResponse } from "next/server";
import { writeAdminAudit } from "@/lib/admin-audit";
import { requirePermission } from "@/lib/admin-auth";
import { issueGroupKaringProbe, NodeKaringProbeError } from "@/lib/node-karing-probe";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission("nodes");
  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await params;

  try {
    const result = await issueGroupKaringProbe(id);
    await writeAdminAudit({
      actor: auth.user,
      action: "group_karing_probe",
      targetType: "instance_group",
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
