import { describe, expect, it } from "vitest";
import { lemonCheckoutPayload } from "@/lib/payments/lemon";

describe("lemon checkout payload", () => {
  it("prices the server order in cents and sends only the payment id", () => {
    const payload = lemonCheckoutPayload({
      storeId: "store_1",
      variantId: "variant_1",
      email: "buyer@example.com",
      paymentId: "pay_1",
      name: "AcrossFlare Month",
      amount: 15,
      currency: "USD",
      redirectUrl: "https://acrossflare.com/en/checkout?paymentId=pay_1",
    });

    expect(payload.data.attributes.custom_price).toBe(1500);
    expect(payload.data.attributes.checkout_data.custom).toEqual({ payment_id: "pay_1" });
    expect(payload.data.attributes.product_options.redirect_url).toBe(
      "https://acrossflare.com/en/checkout?paymentId=pay_1"
    );
    expect(payload.data.relationships.variant.data.id).toBe("variant_1");
  });
});
