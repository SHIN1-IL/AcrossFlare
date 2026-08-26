import {
  PaymentProvider,
  PaymentStatus,
  Prisma,
  PromoCodeStatus,
  SubscriptionStatus,
  type Payment,
} from "@prisma/client";
import { prisma } from "@/lib/db";
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
  try {
    return await prisma.$transaction((tx) => applyFulfillment(tx, input));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.payment.findUnique({ where: { id: input.paymentId } });
      if (existing) {
        return existing;
      }
    }

    throw error;
  }
}

async function applyFulfillment(tx: Prisma.TransactionClient, input: FulfillInput) {
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
    return payment;
  }

  if (input.status === PaymentStatus.FAILED) {
    await tx.promoCode.updateMany({
      where: { paymentId: payment.id, status: PromoCodeStatus.UNUSED },
      data: { paymentId: null },
    });
    return tx.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.FAILED,
        externalId: input.externalId,
      },
    });
  }

  const subscription = await upsertPaidSubscription(tx, payment);

  await tx.promoCode.updateMany({
    where: { paymentId: payment.id },
    data: { status: PromoCodeStatus.REDEEMED, redeemedAt: new Date() },
  });

  return tx.payment.update({
    where: { id: payment.id },
    data: {
      status: PaymentStatus.SUCCEEDED,
      externalId: input.externalId,
      subscriptionId: subscription.id,
    },
  });
}

async function upsertPaidSubscription(tx: Prisma.TransactionClient, payment: Payment) {
  const existing = await tx.subscription.findFirst({
    where: { userId: payment.userId, product: payment.product },
    orderBy: { createdAt: "desc" },
  });

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
