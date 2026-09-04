"use client";

import { useEffect } from "react";
import { CheckoutView } from "@/components/app/checkout-view";
import { MerchantDisclosure } from "@/components/marketing/merchant-disclosure";
import { useHydrated, useSession, useSessionProbeDone } from "@/hooks/use-account";
import { checkoutReturnPath } from "@/lib/checkout-path";
import { useRouter } from "@/i18n/navigation";

export function CheckoutAuthShell({
  product,
  plan,
  paymentId,
  canceled,
  code,
}: {
  product?: string;
  plan?: string;
  paymentId?: string;
  canceled?: string;
  code?: string;
}) {
  const hydrated = useHydrated();
  const probeDone = useSessionProbeDone();
  const session = useSession();
  const router = useRouter();
  const canceledFlag = canceled === "1" || canceled === "true";

  useEffect(() => {
    if (hydrated && probeDone && !session) {
      router.replace({
        pathname: "/login",
        query: {
          next: checkoutReturnPath({
            product,
            plan,
            paymentId,
            canceled: canceledFlag,
            promoCode: code,
          }),
        },
      });
    }
  }, [canceledFlag, code, hydrated, paymentId, plan, probeDone, product, router, session]);

  if (!hydrated || !probeDone || !session) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="h-8 w-8 animate-pulse rounded-full bg-primary/20" />
      </div>
    );
  }

  return (
    <CheckoutView
      initialSession={session}
      product={product}
      planId={plan}
      paymentId={paymentId}
      promoCodeHint={code}
      canceled={canceledFlag}
      merchant={<MerchantDisclosure />}
    />
  );
}
