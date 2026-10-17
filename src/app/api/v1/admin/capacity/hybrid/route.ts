import { NextResponse } from "next/server";
import { writeAdminAudit } from "@/lib/admin-audit";
import { requirePermission } from "@/lib/admin-auth";
import { ProvisionError } from "@/lib/provision/errors";
import { updateHybridTeamLimits } from "@/lib/provision/capacity";

export async function PATCH(request: Request) {
  const auth = await requirePermission("nodes");
  if ("response" in auth) {
    return auth.response;
  }

  const body = (await request.json().catch(() => null)) as
    | { maxSelectable?: unknown; seatsMax?: unknown }
    | null;

  try {
    const limits = await updateHybridTeamLimits({
      maxSelectable: body?.maxSelectable,
      seatsMax: body?.seatsMax,
    });
    await writeAdminAudit({
      actor: auth.user,
      action: "hybrid_team_limits",
      targetType: "capacity_pool",
      targetId: "global-hybrid",
      meta: limits,
    });
    return NextResponse.json({ ok: true, ...limits });
  } catch (error) {
    if (error instanceof ProvisionError) {
      const status = error.code === "pool_missing" ? 404 : 400;
      return NextResponse.json({ error: error.code }, { status });
    }
    throw error;
  }
}
