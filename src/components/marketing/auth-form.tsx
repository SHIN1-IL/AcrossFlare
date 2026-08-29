"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CachedMarketingLink } from "@/components/marketing/cached-marketing-link";
import { localePath } from "@/i18n/path";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PgReviewNotice } from "@/components/marketing/pg-review-notice";
import { useHydrated } from "@/hooks/use-account";
import { loginRedirectHref, type PublicSession } from "@/lib/auth-types";
import { isPublicCheckoutProduct } from "@/lib/plans";
import { REVIEW_USER_EMAIL } from "@/lib/review-user";
import { hasSignedInFlag, hydrateSession, refreshSession, setPreviewEmail } from "@/lib/session";

export function AuthForm({
  mode,
}: {
  mode: "login" | "signup";
}) {
  const t = useTranslations("auth");
  const tFooter = useTranslations("footer");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [legalAgreed, setLegalAgreed] = useState(false);
  const hydrated = useHydrated();
  const localDemo =
    hydrated &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  const product = searchParams.get("product");
  const plan = searchParams.get("plan");
  const productHint = isPublicCheckoutProduct(product)
    ? [product, plan].filter(Boolean).join(" / ")
    : undefined;

  useEffect(() => {
    if (!hasSignedInFlag()) {
      return;
    }

    let cancelled = false;
    void refreshSession().then((session) => {
      if (cancelled || !session) {
        return;
      }
      const next = searchParams.get("next");
      const checkoutProduct = searchParams.get("product");
      const checkoutPlan = searchParams.get("plan");
      const href =
        isPublicCheckoutProduct(checkoutProduct) && checkoutPlan
          ? `/checkout?product=${encodeURIComponent(checkoutProduct)}&plan=${encodeURIComponent(checkoutPlan)}`
          : loginRedirectHref(session, next);
      window.location.replace(localePath(locale, href));
    });

    return () => {
      cancelled = true;
    };
  }, [locale, searchParams]);

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const email = String(form.get("email") ?? "").trim();
        const password = String(form.get("password") ?? "");

        if (!email || !password) {
          setError(t("errorRequired"));
          return;
        }

        if (mode === "signup") {
          setError(t("errorReviewOnly"));
          return;
        }

        setPending(true);
        setError("");

        try {
          const response = await fetch(`/api/auth/${mode}`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          const data = (await response.json()) as {
            user?: PublicSession;
            error?: string;
          };

          if (!response.ok || !data.user) {
            const message =
              data.error === "required"
                ? t("errorRequired")
                : data.error === "invalid_credentials"
                  ? t("errorInvalid")
                  : data.error === "email_taken"
                    ? t("errorTaken")
                    : data.error === "weak_password"
                      ? t("errorWeak")
                      : data.error === "review_only"
                        ? t("errorReviewOnly")
                        : t("errorGeneric");
            setError(message);
            return;
          }

          setPreviewEmail(null);
          hydrateSession(data.user);

          const next = searchParams.get("next");
          const product = searchParams.get("product");
          const plan = searchParams.get("plan");
          const href =
            isPublicCheckoutProduct(product) && plan
              ? `/checkout?product=${encodeURIComponent(product)}&plan=${encodeURIComponent(plan)}`
              : loginRedirectHref(data.user, next);

          window.location.assign(localePath(locale, href));
        } catch {
          setError(t("errorGeneric"));
        } finally {
          setPending(false);
        }
      }}
    >
      {productHint ? (
        <p className="rounded-[10px] border border-border bg-surface-2 px-3 py-2 font-mono text-xs text-muted-foreground">
          {t("productHint", { product: productHint })}
        </p>
      ) : null}

      <PgReviewNotice />

      <div className="space-y-2">
        <Label htmlFor="email">{t("email")}</Label>
        <Input
          id="email"
          name="email"
          type="text"
          autoComplete="username"
          placeholder={REVIEW_USER_EMAIL}
          className="h-10 rounded-[10px]"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{t("password")}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          className="h-10 rounded-[10px]"
        />
      </div>

      {mode === "signup" ? (
        <div className="space-y-3 text-xs leading-5 text-muted-foreground">
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              className="mt-0.5 size-3.5 shrink-0 accent-primary"
              checked={ageConfirmed}
              onChange={(event) => setAgeConfirmed(event.target.checked)}
            />
            <span>{t("ageConfirm")}</span>
          </label>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              className="mt-0.5 size-3.5 shrink-0 accent-primary"
              checked={legalAgreed}
              onChange={(event) => setLegalAgreed(event.target.checked)}
            />
            <span>
              {t("agreeLegal")}{" "}
              <CachedMarketingLink href="/terms" className="underline-offset-2 hover:text-foreground hover:underline">
                {tFooter("terms")}
              </CachedMarketingLink>
              {" · "}
              <CachedMarketingLink href="/privacy" className="underline-offset-2 hover:text-foreground hover:underline">
                {tFooter("privacy")}
              </CachedMarketingLink>
            </span>
          </label>
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button
        type="submit"
        disabled={pending || mode === "signup"}
        className="h-10 w-full rounded-[10px]"
      >
        {mode === "login" ? t("submitLogin") : t("submitSignup")}
      </Button>

      {localDemo ? (
        <p className="font-mono text-xs text-muted-foreground">{t("demoHint")}</p>
      ) : null}

      <CachedMarketingLink
        href={mode === "login" ? "/signup" : "/login"}
        className="block text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        {mode === "login" ? t("switchToSignup") : t("switchToLogin")}
      </CachedMarketingLink>
    </form>
  );
}
