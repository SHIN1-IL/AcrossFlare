import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthForm } from "@/components/marketing/auth-form";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { resolveLocale } from "@/i18n/locale";
export const revalidate = 3600;

export default async function SignupPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);
  const t = await getTranslations("auth");

  return (
    <MarketingShell>
      <div className="mx-auto flex max-w-md flex-col px-4 py-16">
        <h1 className="text-3xl tracking-tight">{t("signupTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("signupSubtitle")}</p>
        <div className="mt-8 rounded-2xl border border-border bg-card p-6">
          <Suspense>
            <AuthForm mode="signup" />
          </Suspense>
        </div>
      </div>
    </MarketingShell>
  );
}
