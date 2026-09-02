import { CheckoutView } from "@/components/app/checkout-view";
import { SessionProvider } from "@/components/auth/session-provider";
import { MerchantDisclosure } from "@/components/marketing/merchant-disclosure";
import { getCurrentUser } from "@/lib/auth";
import { checkoutReturnPath } from "@/lib/checkout-path";
import { redirect } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

export async function CheckoutAuthShell({
  locale,
  product,
  plan,
  paymentId,
  canceled,
  code,
}: {
  locale: AppLocale;
  product?: string;
  plan?: string;
  paymentId?: string;
  canceled?: string;
  code?: string;
}) {
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
    return null;
  }

  return (
    <SessionProvider initialSession={user}>
      <CheckoutView
        initialSession={user}
        product={product}
        planId={plan}
        paymentId={paymentId}
        promoCodeHint={code}
        canceled={canceled === "1" || canceled === "true"}
        merchant={<MerchantDisclosure />}
      />
    </SessionProvider>
  );
}
