import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { routing, type AppLocale } from "@/i18n/routing";
import { redirect } from "@/i18n/navigation";
import {
  canonicalAdminService,
  productForAdminService,
  type AdminServiceId,
} from "@/lib/admin-service";
import type { ProductId } from "@/lib/plans";

export async function resolveAdminProduct(
  params: Promise<{ locale: string; product: string }>,
  pathSuffix?: string
): Promise<{ locale: AppLocale; service: AdminServiceId; product: ProductId; segment: string }> {
  const resolved = await params;

  if (!hasLocale(routing.locales, resolved.locale)) {
    notFound();
  }

  const service = canonicalAdminService(resolved.product);
  if (!service) {
    notFound();
  }

  if (pathSuffix && resolved.product !== service) {
    redirect({ href: `/admin/${service}/${pathSuffix}`, locale: resolved.locale });
  }

  return {
    locale: resolved.locale,
    service,
    product: productForAdminService(service),
    segment: resolved.product,
  };
}
