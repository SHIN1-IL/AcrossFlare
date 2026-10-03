import {
  PaymentProvider,
  PaymentStatus,
  Prisma,
  PromoCodeStatus,
  SubscriptionStatus,
  type Payment,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { notifyOpsPayment } from "@/lib/ops-notify";
import { pickSameService } from "@/lib/owned-service";
import { planPeriodMs } from "@/lib/plans";

export class PaymentFulfillError extends Error {
  constructor(
    public code: string,
    public status = 400
  ) {
    super(code);
    this.name = "PaymentFulfillError";
  }
}

export type FulfillInput = {
  eventId: string;
  provider: PaymentProvider;
  paymentId: string;
  externalId: string;
  status: Extract<PaymentStatus, "SUCCEEDED" | "FAILED">;
  amount?: number;
  currency?: string;
};

export async function fulfillVerifiedPayment(input: FulfillInput) {
  let result: { payment: Payment; newlySucceeded: boolean };
  try {
    result = await prisma.$transaction((tx) => applyFulfillment(tx, input));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.payment.findUnique({ where: { id: input.paymentId } });
      if (existing) {
        return existing;
      }
    }

    throw error;
  }

  if (result.newlySucceeded) {
    const email =
      (
        await prisma.user.findUnique({
          where: { id: result.payment.userId },
          select: { email: true },
        })
      )?.email ?? "";
    void notifyOpsPayment({
      email,
      planId: result.payment.planId,
      amount: result.payment.amount,
      currency: result.payment.currency,
    }).catch((error) => console.error("ops_notify_payment_failed", error));
  }

  return result.payment;
}

async function applyFulfillment(
  tx: Prisma.TransactionClient,
  input: FulfillInput
): Promise<{ payment: Payment; newlySucceeded: boolean }> {
  await tx.webhookEvent.create({
    data: {
      id: input.eventId,
      provider: input.provider,
      paymentId: input.paymentId,
    },
  });

  const payment = await tx.payment.findUnique({ where: { id: input.paymentId } });
  if (!payment) {
    throw new PaymentFulfillError("payment_not_found", 404);
  }

  if (payment.provider !== input.provider) {
    throw new PaymentFulfillError("provider_mismatch");
  }

  if (input.amount != null && input.amount !== payment.amount) {
    throw new PaymentFulfillError("amount_mismatch");
  }

  if (input.currency && input.currency.toUpperCase() !== payment.currency) {
    throw new PaymentFulfillError("currency_mismatch");
  }

  if (payment.status === PaymentStatus.SUCCEEDED) {
    return { payment, newlySucceeded: false };
  }

  if (input.status === PaymentStatus.FAILED) {
    await tx.promoCode.updateMany({
      where: { paymentId: payment.id, status: PromoCodeStatus.UNUSED },
      data: { paymentId: null },
    });
    const failed = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.FAILED,
        externalId: input.externalId,
      },
    });
    return { payment: failed, newlySucceeded: false };
  }

  const subscription = await upsertPaidSubscription(tx, payment);

  await tx.promoCode.updateMany({
    where: { paymentId: payment.id },
    data: { status: PromoCodeStatus.REDEEMED, redeemedAt: new Date() },
  });

  const succeeded = await tx.payment.update({
    where: { id: payment.id },
    data: {
      status: PaymentStatus.SUCCEEDED,
      externalId: input.externalId,
      subscriptionId: subscription.id,
    },
  });
  return { payment: succeeded, newlySucceeded: true };
}

async function upsertPaidSubscription(tx: Prisma.TransactionClient, payment: Payment) {
  const sameProduct = await tx.subscription.findMany({
    where: { userId: payment.userId, product: payment.product },
    orderBy: { createdAt: "desc" },
  });
  const existing = pickSameService(sameProduct, payment.planId);

  const now = new Date();
  const base =
    existing?.status === SubscriptionStatus.ACTIVE && existing.expiresAt.getTime() > now.getTime()
      ? existing.expiresAt
      : now;
  const expiresAt = new Date(base.getTime() + planPeriodMs(payment.planId));

  if (!existing) {
    return tx.subscription.create({
      data: {
        userId: payment.userId,
        planId: payment.planId,
        product: payment.product,
        status: SubscriptionStatus.PROVISIONING,
        expiresAt,
        provisionStep: "queued",
        provisionError: "",
        memo: "Awaiting provisioning",
      },
    });
  }

  const nextStatus =
    existing.status === SubscriptionStatus.ACTIVE
      ? SubscriptionStatus.ACTIVE
      : SubscriptionStatus.PROVISIONING;

  return tx.subscription.update({
    where: { id: existing.id },
    data: {
      planId: payment.planId,
      status: nextStatus,
      expiresAt,
      ...(nextStatus === SubscriptionStatus.PROVISIONING
        ? { provisionStep: "queued", provisionError: "", memo: "Awaiting provisioning" }
        : {}),
    },
  });
}
