import { NextResponse } from "next/server";
import { PaymentProvider, PromoCodeStatus } from "@prisma/client";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { alipayProvider, isSimulateEnabled } from "@/lib/payments/config";
import { portoneCustomerPhone } from "@/lib/payments/portone";
import { defaultPaymentMethod, parseAppLocale, parsePaymentMethod, quotePayment } from "@/lib/payments/quote";
import { CheckoutStartError, startProviderCheckout } from "@/lib/payments/start";
import { hasActiveService } from "@/lib/owned-service";
import { poolHasOpenSeat } from "@/lib/provision/capacity";
import { isPublicCheckoutProduct } from "@/lib/plans";
import { lookupPromoCode } from "@/lib/promo";
import { checkoutOrderName, quoteEsimAddon } from "@/lib/esim/catalog";
import { ensureEsimCatalog, toProduct } from "@/lib/esim/store";
import { getMerchant } from "@/lib/legal/merchant";
import { toPrismaProduct } from "@/lib/product";

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        product?: string;
        planId?: string;
        method?: string;
        locale?: string;
        promoCode?: string;
        phoneNumber?: string;
        esimProductId?: string;
      }
    | null;

  const locale = parseAppLocale(body?.locale);
  const product = isPublicCheckoutProduct(body?.product) ? body.product : null;
  const method = parsePaymentMethod(body?.method) ?? (locale ? defaultPaymentMethod(locale) : null);
  const requestedPlanId = body?.planId?.trim() || null;
  const requestedEsimId = body?.esimProductId?.trim() || null;

  if (!body || !locale || !product || !method || (!requestedPlanId && !requestedEsimId)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const plan = requestedPlanId ? await prisma.plan.findUnique({ where: { id: requestedPlanId } }) : null;
  if (requestedPlanId && (!plan || !plan.visible || plan.product !== toPrismaProduct(product))) {
    return NextResponse.json({ error: "invalid_plan" }, { status: 400 });
  }

  if (plan?.poolId && !(await poolHasOpenSeat(plan.poolId))) {
    return NextResponse.json({ error: "capacity_full" }, { status: 409 });
  }

  const owned = plan
    ? await prisma.subscription.findMany({
        where: { userId: user.id },
        select: { planId: true, status: true, expiresAt: true },
      })
    : [];
  const catalog = requestedEsimId ? await ensureEsimCatalog() : null;
  const quote = quoteEsimAddon({
    locale,
    method: method === "ALIPAY" ? "alipay" : "card",
    product,
    plan: plan
      ? {
          id: plan.id,
          priceKrw: plan.priceKrw,
          priceUsd: plan.priceUsd,
          priceCny: plan.priceCny,
          priceJpy: plan.priceJpy,
        }
      : null,
    esimProductId: requestedEsimId,
    enabled: catalog?.settings.enabled ?? false,
    products: catalog?.products.map(toProduct) ?? [],
    ownsConnection: plan ? hasActiveService(owned, plan.id) : false,
  });
  if (!quote.ok) {
    const status = quote.error === "already_owned" ? 409 : 400;
    return NextResponse.json({ error: quote.error === "empty" ? "invalid_request" : quote.error }, { status });
  }

  let promoId: string | null = null;
  if (product === "workspace") {
    const promo = await lookupPromoCode(body.promoCode ?? "");
    if (!promo.ok || !plan || promo.planId !== plan.id) {
      return NextResponse.json({ error: "invalid_code" }, { status: 400 });
    }
    promoId = promo.id;
  }

  const priced = quote.amount != null || !plan ? null : quotePayment(locale, method, plan);
  const amount = quote.amount ?? priced?.amount ?? 0;
  const currency = quote.currency ?? priced?.currency ?? "KRW";
  const provider =
    quote.currency != null
      ? method === "ALIPAY"
        ? alipayProvider()
        : PaymentProvider.PORTONE
      : priced?.provider ?? PaymentProvider.PORTONE;
  if (amount <= 0) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const phoneNumber = portoneCustomerPhone(body.phoneNumber);
  const needsPortonePhone = !isSimulateEnabled() && provider === PaymentProvider.PORTONE;
  if (needsPortonePhone && !phoneNumber) {
    return NextResponse.json(
      { error: body.phoneNumber?.trim() ? "phone_invalid" : "phone_required" },
      { status: 400 }
    );
  }
  const payment = await prisma.payment.create({
    data: {
      userId: user.id,
      planId: quote.planId,
      product: plan?.product ?? toPrismaProduct(product),
      locale,
      provider,
      method,
      amount,
      currency,
      esimProductId: quote.esim?.id,
      esimName: quote.esim?.name ?? "",
      esimDataGb: quote.esim?.dataGb,
      esimDays: quote.esim?.days,
      esimPriceKrw: quote.esim?.priceKrw,
      esimChargedAmount: quote.esim?.chargedAmount,
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
      orderName: checkoutOrderName({
        serviceName: getMerchant().serviceName,
        planName: plan?.name ?? null,
        esimName: quote.esim?.name ?? null,
      }),
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
