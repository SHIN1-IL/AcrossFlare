import { setRequestLocale } from "next-intl/server";
import { CheckoutView } from "@/components/app/checkout-view";
import { SessionProvider } from "@/components/auth/session-provider";
import { MerchantDisclosure } from "@/components/marketing/merchant-disclosure";
import { resolveLocale } from "@/i18n/locale";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { checkoutReturnPath } from "@/lib/checkout-path";
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

  const user = await getCurrentUser();
  if (!user) {
    redirect({
      href: {
        pathname: "/login",
        query: {
          next: checkoutReturnPath({
            product,
            plan,
            paymentId,
            canceled: canceled === "1" || canceled === "true",
            promoCode: code,
          }),
        },
      },
      locale,
    });
    return;
  }

  let promoCode: string | undefined;
  if (code && plan) {
    const result = await lookupPromoCode(code);
    if (result.ok && result.planId === plan && (!product || result.product === product)) {
      promoCode = result.code;
    }
  }

  return (
    <SessionProvider initialSession={user}>
      <CheckoutView
        initialSession={user}
        product={product}
        planId={plan}
        paymentId={paymentId}
        promoCode={promoCode}
        canceled={canceled === "1" || canceled === "true"}
        merchant={<MerchantDisclosure />}
      />
    </SessionProvider>
  );
}
