import { NextResponse } from "next/server";
import { isAdminRole } from "@/lib/admin-permissions";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const payment = await prisma.payment.findFirst({
    where: isAdminRole(user.role) ? { id } : { id, userId: user.id },
    include: {
      subscription: {
        select: {
          id: true,
          status: true,
          provisionStep: true,
          provisionError: true,
        },
      },
    },
  });

  if (!payment) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    paymentId: payment.id,
    status: payment.status,
    provider: payment.provider,
    method: payment.method === "CARD" ? "card" : "alipay",
    amount: payment.amount,
    currency: payment.currency,
    subscriptionId: payment.subscriptionId,
    subscriptionStatus: payment.subscription?.status ?? null,
    provisionStep: payment.subscription?.provisionStep ?? null,
    provisionError: payment.subscription?.provisionError ?? null,
  });
}
