import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isSimulateEnabled } from "@/lib/payments/config";
import { defaultPaymentMethod, parseAppLocale, parsePaymentMethod, quotePayment } from "@/lib/payments/quote";
import { CheckoutStartError, startProviderCheckout } from "@/lib/payments/start";
import { isProductId } from "@/lib/plans";
import { toPrismaProduct } from "@/lib/product";

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { product?: string; planId?: string; method?: string; locale?: string }
    | null;

  const locale = parseAppLocale(body?.locale);
  const product = isProductId(body?.product) ? body.product : null;
  const method = parsePaymentMethod(body?.method) ?? (locale ? defaultPaymentMethod(locale) : null);

  if (!locale || !product || !method || !body?.planId) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const plan = await prisma.plan.findUnique({ where: { id: body.planId } });
  if (!plan || !plan.visible || plan.product !== toPrismaProduct(product)) {
    return NextResponse.json({ error: "invalid_plan" }, { status: 400 });
  }

  const quote = quotePayment(locale, method, plan);
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
    });
    return NextResponse.json({ ...base, ...live });
  } catch (error) {
    if (error instanceof CheckoutStartError) {
      return NextResponse.json({ ...base, error: error.code }, { status: 502 });
    }

    throw error;
  }
}
