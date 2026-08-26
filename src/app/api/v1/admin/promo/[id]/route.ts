import { NextResponse } from "next/server";
import { AdminActionError, removeAdminPromoCode } from "@/lib/admin-actions";
import { requirePermission } from "@/lib/admin-auth";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("codes");
  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await context.params;

  try {
    await removeAdminPromoCode(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AdminActionError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }
    throw error;
  }
}
