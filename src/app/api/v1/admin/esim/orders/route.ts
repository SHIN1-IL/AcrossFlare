import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";
import { retryPendingEsimOrders } from "@/lib/esim/supplier-order";
import { prisma } from "@/lib/db";

export async function GET() {
  const auth = await requirePermission("customers");
  if ("response" in auth) {
    return auth.response;
  }

  await retryPendingEsimOrders();
  const orders = await prisma.esimOrder.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: { select: { email: true } } },
  });

  return NextResponse.json({
    orders: orders.map((order) => ({
      id: order.id,
      email: order.user.email,
      name: order.name,
      dataGb: order.dataGb,
      days: order.days,
      priceKrw: order.priceKrw,
      currency: order.currency,
      chargedAmount: order.chargedAmount,
      status: order.status,
      qrText: order.qrText,
      supplierOrderNo: order.supplierOrderNo,
      supplierError: order.supplierError,
      createdAt: order.createdAt.toISOString(),
    })),
  });
}
