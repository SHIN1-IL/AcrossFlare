import { setRequestLocale } from "next-intl/server";
import { resolveAdminProduct } from "@/lib/admin-product";

export const dynamic = "force-dynamic";

export default async function AdminProductLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; product: string }>;
}) {
  const { locale } = await resolveAdminProduct(params);
  setRequestLocale(locale);
  return children;
}
