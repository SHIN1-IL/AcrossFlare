import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { resolveAdminProduct } from "@/lib/admin-product";

export default async function AdminProductIndexPage({
  params,
}: {
  params: Promise<{ locale: string; product: string }>;
}) {
  const { locale, product } = await resolveAdminProduct(params);
  setRequestLocale(locale);
  redirect({ href: `/admin/${product}/customers`, locale });
}
