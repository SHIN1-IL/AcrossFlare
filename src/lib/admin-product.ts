import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { routing, type AppLocale } from "@/i18n/routing";
import { isProductId, type ProductId } from "@/lib/plans";

export async function resolveAdminProduct(
  params: Promise<{ locale: string; product: string }>
): Promise<{ locale: AppLocale; product: ProductId }> {
  const resolved = await params;

  if (!hasLocale(routing.locales, resolved.locale)) {
    notFound();
  }

  if (!isProductId(resolved.product)) {
    notFound();
  }

  return { locale: resolved.locale, product: resolved.product };
}
