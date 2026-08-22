import { PaymentStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isSimulateEnabled } from "@/lib/payments/config";
import { fulfillVerifiedPayment, PaymentFulfillError } from "@/lib/payments/fulfill";
import { provisionSubscription } from "@/lib/provision/run";

export async function POST(request: Request) {
  if (!isSimulateEnabled()) {
    return NextResponse.json({ error: "simulate_disabled" }, { status: 403 });
  }

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { paymentId?: string; outcome?: "succeeded" | "failed" }
    | null;
  const paymentId = body?.paymentId ?? "";

  if (!paymentId) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, userId: user.id },
  });

  if (!payment) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const updated = await fulfillVerifiedPayment({
      eventId: `simulate:${payment.id}:${Date.now()}`,
      provider: payment.provider,
      paymentId: payment.id,
      externalId: `sim_${payment.id}`,
      status: body?.outcome === "failed" ? "FAILED" : "SUCCEEDED",
    });

    if (updated.status === PaymentStatus.SUCCEEDED && updated.subscriptionId) {
      try {
        await provisionSubscription(updated.subscriptionId);
      } catch (error) {
        console.error("provision_failed", error);
      }
    }

    return NextResponse.json({
      paymentId: updated.id,
      status: updated.status,
      subscriptionId: updated.subscriptionId,
    });
  } catch (error) {
    if (error instanceof PaymentFulfillError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }

    throw error;
  }
}
