import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const orders = await prisma.esimOrder.findMany({
    where: { userId: user.id, status: { not: "CANCELLED" } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      dataGb: true,
      days: true,
      priceKrw: true,
      currency: true,
      chargedAmount: true,
      status: true,
      qrText: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    orders: orders.map((order) => ({
      ...order,
      createdAt: order.createdAt.toISOString(),
    })),
  });
}
