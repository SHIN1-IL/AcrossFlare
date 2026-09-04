import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { CheckoutAuthShell } from "@/components/auth/checkout-auth-shell";
import { CheckoutLoading } from "@/components/app/checkout-loading";
import { resolveLocale } from "@/i18n/locale";

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

  return (
    <Suspense fallback={<CheckoutLoading />}>
      <CheckoutAuthShell
        product={product}
        plan={plan}
        paymentId={paymentId}
        canceled={canceled}
        code={code}
      />
    </Suspense>
  );
}
