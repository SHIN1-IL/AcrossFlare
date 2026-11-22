import { toStripeMinorUnits } from "@/lib/payments/quote";

export function lemonCheckoutPayload(input: {
  storeId: string;
  variantId: string;
  email: string;
  paymentId: string;
  name: string;
  amount: number;
  currency: string;
  redirectUrl: string;
}) {
  return {
    data: {
      type: "checkouts",
      attributes: {
        custom_price: toStripeMinorUnits(input.amount, input.currency),
        product_options: {
          name: input.name.slice(0, 100),
          redirect_url: input.redirectUrl,
          receipt_link_url: input.redirectUrl,
        },
        checkout_data: {
          email: input.email,
          custom: {
            payment_id: input.paymentId,
          },
        },
      },
      relationships: {
        store: { data: { type: "stores", id: input.storeId } },
        variant: { data: { type: "variants", id: input.variantId } },
      },
    },
  };
}
