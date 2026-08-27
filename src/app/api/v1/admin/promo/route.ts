import { NextResponse } from "next/server";
import { writeAdminAudit } from "@/lib/admin-audit";
import { AdminActionError, createAdminPromoCode } from "@/lib/admin-actions";
import { requirePermission } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const auth = await requirePermission("codes");
  if ("response" in auth) {
    return auth.response;
  }

  const body = (await request.json().catch(() => null)) as
    | { planId?: string; code?: string; note?: string }
    | null;

  if (!body?.planId) {
    return NextResponse.json({ error: "required" }, { status: 400 });
  }

  try {
    const code = await createAdminPromoCode({
      planId: body.planId,
      code: body.code,
      note: body.note,
    });
    await writeAdminAudit({
      actor: auth.user,
      action: "promo_create",
      targetType: "promo",
      targetId: code.id,
    });
    return NextResponse.json({ code });
  } catch (error) {
    if (error instanceof AdminActionError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }
    throw error;
  }
}
