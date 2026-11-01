import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("customers");
  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await params;
  const userId = id.startsWith("signup:")
    ? id.slice("signup:".length)
    : (
        await prisma.subscription.findUnique({
          where: { id },
          select: { userId: true },
        })
      )?.userId;

  if (!userId) {
    return NextResponse.json({ orders: [] });
  }

  const orders = await prisma.esimOrder.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    orders: orders.map((order) => ({
      id: order.id,
      name: order.name,
      dataGb: order.dataGb,
      days: order.days,
      priceKrw: order.priceKrw,
      currency: order.currency,
      chargedAmount: order.chargedAmount,
      status: order.status,
      qrText: order.qrText,
      createdAt: order.createdAt.toISOString(),
    })),
  });
}
