import { PaymentProvider, PaymentStatus } from "@prisma/client";
import { after, NextResponse } from "next/server";
import { fulfillVerifiedPayment, PaymentFulfillError } from "@/lib/payments/fulfill";
import { verifyPaymentWebhook, WebhookVerifyError } from "@/lib/payments/verify";
import { provisionSubscription } from "@/lib/provision/run";

export async function POST(request: Request) {
  return handleWebhook(request);
}

export async function GET(request: Request) {
  return handleWebhook(request);
}

async function handleWebhook(request: Request) {
  try {
    const verified = await verifyPaymentWebhook(request);
    const payment = await fulfillVerifiedPayment(verified);

    if (payment.status === PaymentStatus.SUCCEEDED && payment.subscriptionId) {
      const subscriptionId = payment.subscriptionId;
      after(async () => {
        try {
          await provisionSubscription(subscriptionId);
        } catch (error) {
          console.error("provision_failed", error);
        }
      });
    }

    if (verified.provider === PaymentProvider.PAYMENTWALL) {
      return new Response("OK", { status: 200 });
    }

    return NextResponse.json({
      received: true,
      paymentId: payment.id,
      status: payment.status,
    });
  } catch (error) {
    if (error instanceof WebhookVerifyError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }

    if (error instanceof PaymentFulfillError) {
      if (error.code === "payment_not_found") {
        return NextResponse.json({ received: true, ignored: true }, { status: 200 });
      }

      return NextResponse.json({ error: error.code }, { status: error.status });
    }

    throw error;
  }
}
