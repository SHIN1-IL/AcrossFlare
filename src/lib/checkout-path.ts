import { loginRedirectHref, type PublicSession } from "@/lib/auth-types";
import { isPublicCheckoutProduct } from "@/lib/plans";

export function checkoutReturnPath(input: {
  product?: string;
  plan?: string;
  data?: string;
  paymentId?: string;
  promoCode?: string;
  canceled?: boolean;
}) {
  const query = new URLSearchParams();
  if (input.product) {
    query.set("product", input.product);
  }
  if (input.plan) {
    query.set("plan", input.plan);
  }
  if (input.data) {
    query.set("data", input.data);
  }
  if (input.promoCode) {
    query.set("code", input.promoCode);
  }
  if (input.paymentId) {
    query.set("paymentId", input.paymentId);
  }
  if (input.canceled) {
    query.set("canceled", "1");
  }
  const qs = query.toString();
  return qs ? `/checkout?${qs}` : "/checkout";
}

export function signedInContinuePath(
  session: PublicSession,
  params: { next?: string | null; product?: string | null; plan?: string | null; data?: string | null }
) {
  if (isPublicCheckoutProduct(params.product) && (params.plan || params.data)) {
    return checkoutReturnPath({
      product: params.product,
      plan: params.plan ?? undefined,
      data: params.data ?? undefined,
    });
  }
  return loginRedirectHref(session, params.next);
}
