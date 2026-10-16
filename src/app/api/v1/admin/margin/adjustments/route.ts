import { NextResponse } from "next/server";
import { writeAdminAudit } from "@/lib/admin-audit";
import { AdminActionError } from "@/lib/admin-actions";
import { requireOwner } from "@/lib/admin-auth";
import { createMarginAdjustment } from "@/lib/margin-data";
import { currentMonthKey, parseAdjustmentBody } from "@/lib/margin";

export async function POST(request: Request) {
  const auth = await requireOwner();
  if ("response" in auth) {
    return auth.response;
  }

  const input = parseAdjustmentBody(await request.json().catch(() => null), currentMonthKey());
  if (!input) {
    return NextResponse.json({ error: "required" }, { status: 400 });
  }

  try {
    const adjustment = await createMarginAdjustment(input);
    await writeAdminAudit({
      actor: auth.user,
      action: "margin_adjustment_add",
      targetType: "margin_adjustment",
      targetId: adjustment.id,
      meta: { label: adjustment.label, amountKrw: adjustment.amountKrw, month: adjustment.month },
    });
    return NextResponse.json({ adjustment });
  } catch (error) {
    if (error instanceof AdminActionError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }
    throw error;
  }
}
