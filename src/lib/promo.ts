import { PromoCodeStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { toProductId } from "@/lib/product";
import { newSecret } from "@/lib/provision/build";

export function normalizePromoCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
}

export function generatePromoCode() {
  return `AF-${newSecret(4).toUpperCase().replace(/[^A-Z0-9]/g, "X").slice(0, 8)}`;
}

export async function lookupPromoCode(raw: string) {
  const code = normalizePromoCode(raw);
  if (code.length < 4) {
    return { ok: false as const, error: "invalid" as const };
  }

  const promo = await prisma.promoCode.findUnique({
    where: { code },
    include: { plan: true },
  });

  if (!promo || promo.status !== PromoCodeStatus.UNUSED || promo.paymentId) {
    return { ok: false as const, error: "invalid" as const };
  }

  return {
    ok: true as const,
    id: promo.id,
    code: promo.code,
    planId: promo.planId,
    product: toProductId(promo.plan.product),
  };
}
