import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthForm } from "@/components/marketing/auth-form";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { getCurrentUser } from "@/lib/auth";
import { afterLoginHref } from "@/lib/auth-types";
import { resolveLocale } from "@/i18n/locale";
import { redirect } from "@/i18n/navigation";
import { isPublicCheckoutProduct } from "@/lib/plans";

export default async function SignupPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ product?: string; plan?: string }>;
}) {
  const locale = await resolveLocale(params);
  const { product, plan } = await searchParams;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (user) {
    redirect({ href: afterLoginHref(user), locale });
  }

  const t = await getTranslations("auth");

  const productHint = isPublicCheckoutProduct(product)
    ? [product, plan].filter(Boolean).join(" / ")
    : undefined;

  return (
    <MarketingShell>
      <div className="mx-auto flex max-w-md flex-col px-4 py-16">
        <h1 className="text-3xl tracking-tight">{t("signupTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("signupSubtitle")}</p>
        <div className="mt-8 rounded-2xl border border-border bg-card p-6">
          <Suspense>
            <AuthForm mode="signup" productHint={productHint} />
          </Suspense>
        </div>
      </div>
    </MarketingShell>
  );
}
