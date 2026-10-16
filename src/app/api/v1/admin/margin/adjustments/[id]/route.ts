import { NextResponse } from "next/server";
import { writeAdminAudit } from "@/lib/admin-audit";
import { AdminActionError } from "@/lib/admin-actions";
import { requireOwner } from "@/lib/admin-auth";
import { deleteMarginAdjustment, updateMarginAdjustment } from "@/lib/margin-data";
import { currentMonthKey, parseAdjustmentBody } from "@/lib/margin";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOwner();
  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await params;
  const input = parseAdjustmentBody(await request.json().catch(() => null), currentMonthKey());
  if (!input) {
    return NextResponse.json({ error: "required" }, { status: 400 });
  }

  try {
    const adjustment = await updateMarginAdjustment(id, input);
    await writeAdminAudit({
      actor: auth.user,
      action: "margin_adjustment_update",
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

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOwner();
  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await params;
  try {
    const adjustment = await deleteMarginAdjustment(id);
    await writeAdminAudit({
      actor: auth.user,
      action: "margin_adjustment_delete",
      targetType: "margin_adjustment",
      targetId: adjustment.id,
      meta: { label: adjustment.label },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AdminActionError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }
    throw error;
  }
}
