import { setRequestLocale } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { CheckoutView } from "@/components/app/checkout-view";

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ product?: string; plan?: string; paymentId?: string; canceled?: string }>;
}) {
  const locale = await resolveLocale(params);
  const { product, plan, paymentId, canceled } = await searchParams;
  setRequestLocale(locale);

  return (
    <CheckoutView
      product={product}
      planId={plan}
      paymentId={paymentId}
      canceled={canceled === "1" || canceled === "true"}
    />
  );
}
