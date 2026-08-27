import { NextResponse } from "next/server";
import { PaymentProvider, PromoCodeStatus } from "@prisma/client";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isSimulateEnabled } from "@/lib/payments/config";
import { portoneCustomerPhone } from "@/lib/payments/portone";
import { defaultPaymentMethod, parseAppLocale, parsePaymentMethod, quotePayment } from "@/lib/payments/quote";
import { CheckoutStartError, startProviderCheckout } from "@/lib/payments/start";
import { isPublicCheckoutProduct } from "@/lib/plans";
import { lookupPromoCode } from "@/lib/promo";
import { toPrismaProduct } from "@/lib/product";
import { canStartPublicCheckout } from "@/lib/review-user";

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!canStartPublicCheckout(user.email)) {
    return NextResponse.json({ error: "review_only" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        product?: string;
        planId?: string;
        method?: string;
        locale?: string;
        promoCode?: string;
        phoneNumber?: string;
      }
    | null;

  const locale = parseAppLocale(body?.locale);
  const product = isPublicCheckoutProduct(body?.product) ? body.product : null;
  const method = parsePaymentMethod(body?.method) ?? (locale ? defaultPaymentMethod(locale) : null);

  if (!locale || !product || !method || !body?.planId) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const plan = await prisma.plan.findUnique({ where: { id: body.planId } });
  if (!plan || !plan.visible || plan.product !== toPrismaProduct(product)) {
    return NextResponse.json({ error: "invalid_plan" }, { status: 400 });
  }

  let promoId: string | null = null;
  if (product === "workspace") {
    const promo = await lookupPromoCode(body.promoCode ?? "");
    if (!promo.ok || promo.planId !== plan.id) {
      return NextResponse.json({ error: "invalid_code" }, { status: 400 });
    }
    promoId = promo.id;
  }

  const quote = quotePayment(locale, method, plan);
  const phoneNumber = portoneCustomerPhone(body.phoneNumber);
  const needsPortonePhone = !isSimulateEnabled() && quote.provider === PaymentProvider.PORTONE;
  if (needsPortonePhone && !phoneNumber) {
    return NextResponse.json(
      { error: body.phoneNumber?.trim() ? "phone_invalid" : "phone_required" },
      { status: 400 }
    );
  }
  const payment = await prisma.payment.create({
    data: {
      userId: user.id,
      planId: plan.id,
      product: plan.product,
      locale,
      provider: quote.provider,
      method,
      amount: quote.amount,
      currency: quote.currency,
    },
  });

  if (promoId) {
    const reserved = await prisma.promoCode.updateMany({
      where: { id: promoId, status: PromoCodeStatus.UNUSED, paymentId: null },
      data: { paymentId: payment.id },
    });
    if (reserved.count !== 1) {
      await prisma.payment.delete({ where: { id: payment.id } });
      return NextResponse.json({ error: "invalid_code" }, { status: 400 });
    }
  }

  const base = {
    paymentId: payment.id,
    provider: payment.provider,
    method: payment.method === "CARD" ? "card" : "alipay",
    amount: payment.amount,
    currency: payment.currency,
    mode: isSimulateEnabled() ? "simulate" : "live",
  };

  if (isSimulateEnabled()) {
    return NextResponse.json(base);
  }

  try {
    const live = await startProviderCheckout({
      payment,
      plan,
      email: user.email,
      product,
      phoneNumber,
    });
    return NextResponse.json({ ...base, ...live });
  } catch (error) {
    if (promoId) {
      await prisma.promoCode.updateMany({
        where: { paymentId: payment.id, status: PromoCodeStatus.UNUSED },
        data: { paymentId: null },
      });
    }
    if (error instanceof CheckoutStartError) {
      return NextResponse.json({ ...base, error: error.code }, { status: 502 });
    }

    throw error;
  }
}
