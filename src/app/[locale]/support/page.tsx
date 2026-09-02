import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { SupportAuthShell } from "@/components/auth/support-auth-shell";
import { CheckoutLoading } from "@/components/app/checkout-loading";
import { resolveLocale } from "@/i18n/locale";

export default async function SupportRoute({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);

  return (
    <Suspense fallback={<CheckoutLoading />}>
      <SupportAuthShell locale={locale} />
    </Suspense>
  );
}
