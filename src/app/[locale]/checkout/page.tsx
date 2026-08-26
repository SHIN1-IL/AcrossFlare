import { setRequestLocale } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { CheckoutView } from "@/components/app/checkout-view";
import { MerchantDisclosure } from "@/components/marketing/merchant-disclosure";
import { lookupPromoCode } from "@/lib/promo";

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    product?: string;
    plan?: string;
    paymentId?: string;
    canceled?: string;
    code?: string;
  }>;
}) {
  const locale = await resolveLocale(params);
  const { product, plan, paymentId, canceled, code } = await searchParams;
  setRequestLocale(locale);

  let promoCode: string | undefined;
  if (code && plan) {
    const result = await lookupPromoCode(code);
    if (result.ok && result.planId === plan && (!product || result.product === product)) {
      promoCode = result.code;
    }
  }

  return (
    <CheckoutView
      product={product}
      planId={plan}
      paymentId={paymentId}
      promoCode={promoCode}
      canceled={canceled === "1" || canceled === "true"}
      merchant={<MerchantDisclosure />}
    />
  );
}
