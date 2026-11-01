import { NextResponse } from "next/server";
import { EsimOrderStatus } from "@prisma/client";
import { requirePermission } from "@/lib/admin-auth";
import { writeAdminAudit } from "@/lib/admin-audit";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("customers");
  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await params;
  const order = await prisma.esimOrder.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as { qrText?: unknown; cancel?: unknown } | null;
  if (!body) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  if (body.cancel === true) {
    if (order.status !== EsimOrderStatus.AWAITING_QR) {
      return NextResponse.json({ error: "already_issued" }, { status: 409 });
    }
    const cancelled = await prisma.esimOrder.update({
      where: { id },
      data: { status: EsimOrderStatus.CANCELLED },
    });
    await writeAdminAudit({
      actor: auth.user,
      action: "esim_order_cancel",
      targetType: "esim_order",
      targetId: id,
    });
    return NextResponse.json({ id: cancelled.id, status: cancelled.status });
  }

  const qrText = typeof body.qrText === "string" ? body.qrText.trim() : "";
  if (!qrText || qrText.length > 4000) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const ready = await prisma.esimOrder.update({
    where: { id },
    data: { qrText, status: EsimOrderStatus.READY },
  });
  await writeAdminAudit({
    actor: auth.user,
    action: "esim_qr_save",
    targetType: "esim_order",
    targetId: id,
  });
  return NextResponse.json({ id: ready.id, status: ready.status });
}
