import { setRequestLocale } from "next-intl/server";
import { resolveAdminProduct } from "@/lib/admin-product";

export function generateStaticParams() {
  return [{ product: "global" }, { product: "marketing" }];
}

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
