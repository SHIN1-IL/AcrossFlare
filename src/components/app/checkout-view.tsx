"use client";

import { Check, LoaderCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PaymentTabs } from "@/components/app/payment-tabs";
import { LegalFooterLinks } from "@/components/marketing/legal-footer-links";
import { LocaleSwitcher } from "@/components/marketing/locale-switcher";
import { Logo } from "@/components/marketing/logo";
import { PgReviewNotice } from "@/components/marketing/pg-review-notice";
import { Button, buttonVariants } from "@/components/ui/button";
import { useAccount, useHydrated } from "@/hooks/use-account";
import { Link, useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { type PaymentMethod } from "@/lib/account";
import { provisionProduct, refreshRemoteAccount } from "@/lib/account-store";
import { PriceAmount, SecondaryPriceAmount } from "@/components/marketing/price-amount";
import { useLivePlan } from "@/hooks/use-admin";
import { isPublicCheckoutProduct } from "@/lib/plans";
import type { PortOneCheckout } from "@/lib/payments/portone";
import { canStartPublicCheckout } from "@/lib/review-user";
import { cn } from "@/lib/utils";

const CHECKOUT_FAILURES = [
  "timeout",
  "invalid_code",
  "review_only",
  "portone_not_configured",
  "stripe_not_configured",
  "stripe_checkout_failed",
  "paymentwall_not_configured",
  "phone_required",
  "phone_invalid",
] as const;

type CheckoutFailure = (typeof CHECKOUT_FAILURES)[number] | "failed" | "agree";

const STEPS = [
  { id: "payment", key: "stepPayment" },
  { id: "xui", key: "stepXui" },
  { id: "backup", key: "stepBackup" },
  { id: "ready", key: "stepReady" },
] as const;

function checkoutProductLabel(
  product: string,
  planId: string,
  t: (key: "productWorkspace" | "productHybrid" | "productStandard") => string
) {
  if (product === "workspace") return t("productWorkspace");
  if (planId.startsWith("hybrid")) return t("productHybrid");
  return t("productStandard");
}

export function CheckoutView({
  product,
  planId,
  paymentId,
  promoCode,
  canceled = false,
  merchant,
}: {
  product?: string;
  planId?: string;
  paymentId?: string;
  promoCode?: string;
  canceled?: boolean;
  merchant?: React.ReactNode;
}) {
  const t = useTranslations("checkout");
  const tFooter = useTranslations("footer");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const hydrated = useHydrated();
  const { session } = useAccount();
  const plan = useLivePlan(planId);
  const validProduct = isPublicCheckoutProduct(product) && plan?.product === product ? product : null;
  const [method, setMethod] = useState<PaymentMethod>(locale === "zh" ? "alipay" : "card");
  const [agreed, setAgreed] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phase, setPhase] = useState<"form" | "processing" | "provisioning">(
    paymentId && !canceled ? "processing" : "form"
  );
  const [step, setStep] = useState(0);
  const [error, setError] = useState<CheckoutFailure | null>(canceled ? "failed" : null);
  const [payStatus, setPayStatus] = useState<"processing" | "openingWindow" | "redirecting">(
    "processing"
  );
  const resumeRef = useRef(false);

  const steps = useMemo(
    () =>
      validProduct === "global"
        ? [...STEPS]
        : STEPS.filter((item) => item.id !== "backup"),
    [validProduct]
  );

  const finishPaidCheckout = useCallback(
    async (id: string) => {
      const paid = await waitForPayment(id);
      if (paid.status !== "SUCCEEDED") {
        throw new Error("failed");
      }

      setStep(Math.max(steps.findIndex((item) => item.id === "xui"), 1));
      setPhase("provisioning");

      await waitForProvision(id, (provisionStep) => {
        const target =
          provisionStep === "ready"
            ? "ready"
            : provisionStep === "backup" || provisionStep === "nextcloud"
              ? "backup"
              : "xui";
        const index = steps.findIndex((item) => item.id === target);
        setStep(index >= 0 ? index : 1);
      });

      setStep(steps.length - 1);
      await sleep(500);
      if (!session || !validProduct || !plan) {
        return;
      }
      await refreshRemoteAccount(session.email);
      provisionProduct(session.email, validProduct, plan.id, method);
      router.push(validProduct === "workspace" ? "/app/workspace" : "/app/global");
    },
    [method, plan, router, session, steps, validProduct]
  );

  async function startPayment() {
    if (!validProduct || !plan) {
      return;
    }

    if (!agreed) {
      setError("agree");
      return;
    }

    if (method === "card" && !phoneNumber.trim()) {
      setError("phone_required");
      return;
    }

    if (!canStartPublicCheckout(session?.email)) {
      setError("review_only");
      return;
    }

    if (validProduct === "workspace" && !promoCode) {
      setError("invalid_code");
      return;
    }

    setError(null);
    setPayStatus(method === "card" ? "openingWindow" : "redirecting");
    setPhase("processing");

    try {
      const created = await fetch("/api/v1/payments/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: validProduct,
          planId: plan.id,
          method,
          locale,
          promoCode,
          phoneNumber,
        }),
      });
      const checkout = (await created.json()) as {
        paymentId?: string;
        mode?: string;
        error?: string;
        redirectUrl?: string;
        portone?: PortOneCheckout;
      };
      if (checkout.error) {
        throw new Error(
            checkout.error === "invalid_code" ||
            checkout.error === "review_only" ||
            checkout.error === "portone_not_configured" ||
            checkout.error === "stripe_not_configured" ||
            checkout.error === "stripe_checkout_failed" ||
            checkout.error === "paymentwall_not_configured" ||
            checkout.error === "phone_required" ||
            checkout.error === "phone_invalid"
            ? checkout.error
            : "failed"
        );
      }
      if (!created.ok || !checkout.paymentId) {
        throw new Error("failed");
      }

      if (checkout.mode === "simulate") {
        setPayStatus("processing");
        const simulated = await fetch("/api/v1/payments/simulate", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId: checkout.paymentId }),
        });
        if (!simulated.ok) {
          throw new Error("failed");
        }
        await finishPaidCheckout(checkout.paymentId);
        return;
      }

      if (checkout.redirectUrl) {
        setPayStatus("redirecting");
        window.location.assign(checkout.redirectUrl);
        return;
      }

      if (checkout.portone) {
        setPayStatus("openingWindow");
        const result = await requestPortOnePayment(checkout.portone);
        if (result === "redirect") {
          return;
        }
        setPayStatus("processing");
        await finishPaidCheckout(checkout.paymentId);
        return;
      }

      throw new Error("failed");
    } catch (cause) {
      setPhase("form");
      setError(checkoutFailure(cause));
    }
  }

  useEffect(() => {
    if (canceled || !paymentId || resumeRef.current || !hydrated || !session || !validProduct || !plan) {
      return;
    }

    resumeRef.current = true;
    void finishPaidCheckout(paymentId).catch((cause: unknown) => {
      setPhase("form");
      setError(checkoutFailure(cause));
    });
  }, [canceled, finishPaidCheckout, hydrated, paymentId, plan, session, validProduct]);

  useEffect(() => {
    if (hydrated && !session) {
      const query = new URLSearchParams();
      if (product) query.set("product", product);
      if (planId) query.set("plan", planId);
      if (promoCode) query.set("code", promoCode);
      if (paymentId) query.set("paymentId", paymentId);
      router.replace({
        pathname: "/login",
        query: { next: `/checkout?${query.toString()}` },
      });
    }
  }, [hydrated, paymentId, planId, product, promoCode, router, session]);

  if (!hydrated || !session) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-8 w-8 animate-pulse rounded-full bg-primary/20" />
      </div>
    );
  }

  if (!validProduct || !plan) {
    return (
      <CheckoutFrame merchant={merchant}>
        <h1 className="text-3xl tracking-tight">{t("title")}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{t("invalidPlan")}</p>
        <Link href="/pricing" className={cn(buttonVariants({ variant: "outline" }), "mt-6 rounded-[10px]")}>
          {t("backPricing")}
        </Link>
      </CheckoutFrame>
    );
  }

  if (validProduct === "workspace" && !promoCode && !paymentId) {
    return (
      <CheckoutFrame merchant={merchant}>
        <h1 className="text-3xl tracking-tight">{t("title")}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{t("invalidCode")}</p>
        <Link href="/workspace" className={cn(buttonVariants({ variant: "outline" }), "mt-6 rounded-[10px]")}>
          {t("backWorkspace")}
        </Link>
      </CheckoutFrame>
    );
  }

  return (
    <CheckoutFrame merchant={merchant}>
      <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">
        AcrossFlare
      </p>
      <h1 className="mt-3 text-3xl tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>

      <div className="mt-8 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">
              {checkoutProductLabel(validProduct, plan.id, t)} · {plan.name}
            </p>
            <p className="mt-2 font-mono text-3xl tracking-tight">
              <PriceAmount locale={locale} prices={plan.prices} />
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{t("taxIncluded")}</p>
            <SecondaryPriceAmount
              locale={locale}
              prices={plan.prices}
              className="mt-1 font-mono text-xs text-muted-foreground"
            />
          </div>
        </div>

        {phase === "form" ? (
          <div className="mt-6 space-y-5">
            <PaymentTabs value={method} onChange={setMethod} />
            {method === "card" ? (
              <label className="block space-y-1.5">
                <span className="text-xs text-muted-foreground">{t("phoneLabel")}</span>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder={t("phonePlaceholder")}
                  value={phoneNumber}
                  onChange={(event) => {
                    setPhoneNumber(event.target.value);
                    if (error === "phone_required" || error === "phone_invalid") {
                      setError(null);
                    }
                  }}
                  className="h-10 w-full rounded-[10px] border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                />
              </label>
            ) : null}
            {canStartPublicCheckout(session.email) ? null : <PgReviewNotice />}
            {error ? (
              <p className="text-sm text-destructive">
                {error === "timeout"
                  ? t("payTimeout")
                  : error === "invalid_code"
                    ? t("invalidCode")
                    : error === "agree"
                      ? t("agreeRequired")
                      : error === "review_only"
                        ? t("reviewOnly")
                        : error === "phone_required"
                          ? t("phoneRequired")
                          : error === "phone_invalid"
                            ? t("phoneInvalid")
                            : error === "portone_not_configured" ||
                                error === "stripe_not_configured" ||
                                error === "paymentwall_not_configured" ||
                                error === "stripe_checkout_failed"
                              ? t("payNotConfigured")
                              : t("payFailed")}
              </p>
            ) : null}
            <p className="text-xs leading-5 text-muted-foreground">{t("refundNotice")}</p>
            <label className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
              <input
                type="checkbox"
                className="mt-0.5 size-3.5 shrink-0 accent-primary"
                checked={agreed}
                onChange={(event) => {
                  setAgreed(event.target.checked);
                  if (event.target.checked && error === "agree") {
                    setError(null);
                  }
                }}
              />
              <span>{t("agreeLabel")}</span>
            </label>
            <p className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <Link href="/terms" className="transition-colors hover:text-foreground">
                {tFooter("terms")}
              </Link>
              <Link href="/privacy" className="transition-colors hover:text-foreground">
                {tFooter("privacy")}
              </Link>
              <Link
                href={{ pathname: "/terms", hash: "refund" }}
                className="transition-colors hover:text-foreground"
              >
                {tFooter("refund")}
              </Link>
            </p>
            <Button
              type="button"
              className="h-10 w-full rounded-[10px]"
              disabled={!canStartPublicCheckout(session.email)}
              onClick={() => {
                void startPayment();
              }}
            >
              {t("pay")}
            </Button>
          </div>
        ) : null}

        {phase === "processing" ? (
          <div className="mt-6 flex items-start gap-2 text-sm leading-5 text-muted-foreground">
            <LoaderCircle className="mt-0.5 size-4 shrink-0 animate-spin text-primary" />
            {t(payStatus)}
          </div>
        ) : null}

        {phase === "provisioning" ? (
          <ol className="mt-6 space-y-3">
            {steps.map((item, index) => {
              const done = index < step;
              const current = index === step;
              return (
                <li key={item.id} className="flex items-center gap-3 text-sm">
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full border",
                      done || current
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border text-muted-foreground"
                    )}
                  >
                    {done ? (
                      <Check className="size-3.5" />
                    ) : current ? (
                      <LoaderCircle className="size-3.5 animate-spin" />
                    ) : (
                      <span className="size-1 rounded-full bg-current" />
                    )}
                  </span>
                  <span className={done || current ? "text-foreground" : "text-muted-foreground"}>
                    {t(item.key)}
                  </span>
                </li>
              );
            })}
          </ol>
        ) : null}
      </div>
    </CheckoutFrame>
  );
}

function checkoutFailure(cause: unknown): Exclude<CheckoutFailure, "agree"> {
  if (cause instanceof Error && CHECKOUT_FAILURES.includes(cause.message as (typeof CHECKOUT_FAILURES)[number])) {
    return cause.message as (typeof CHECKOUT_FAILURES)[number];
  }

  return "failed";
}

type PaymentPoll = {
  status?: string;
  subscriptionStatus?: string | null;
  provisionStep?: string | null;
};

async function waitForPayment(paymentId: string) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const data = await pollPayment(paymentId);
    if (data.status === "SUCCEEDED" || data.status === "FAILED") {
      return data;
    }

    await sleep(400);
  }

  throw new Error("timeout");
}

async function waitForProvision(paymentId: string, onStep: (step: string | null) => void) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const data = await pollPayment(paymentId);
    onStep(data.provisionStep ?? null);

    if (data.subscriptionStatus === "ACTIVE") {
      return data;
    }

    if (data.status === "FAILED" || data.subscriptionStatus === "FAILED") {
      throw new Error("failed");
    }

    await sleep(400);
  }

  throw new Error("timeout");
}

async function pollPayment(paymentId: string) {
  const response = await fetch(`/api/v1/payments/${paymentId}`, { credentials: "include" });
  const data = (await response.json()) as PaymentPoll;
  if (!response.ok) {
    throw new Error("failed");
  }

  return data;
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

type PortOneSdk = {
  requestPayment: (input: PortOneCheckout) => Promise<{ code?: string } | null>;
};

declare global {
  interface Window {
    PortOne?: PortOneSdk;
  }
}

async function requestPortOnePayment(checkout: PortOneCheckout): Promise<"redirect" | "complete"> {
  const sdk = await loadPortOneSdk();
  const href = window.location.href;
  const result = await sdk.requestPayment(checkout);
  if (window.location.href !== href) {
    return "redirect";
  }

  if (result?.code) {
    throw new Error("failed");
  }

  return "complete";
}

function loadPortOneSdk(): Promise<PortOneSdk> {
  if (window.PortOne) {
    return Promise.resolve(window.PortOne);
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-portone-sdk]");
    if (existing) {
      existing.addEventListener("load", () => {
        if (window.PortOne) {
          resolve(window.PortOne);
        } else {
          reject(new Error("failed"));
        }
      });
      existing.addEventListener("error", () => reject(new Error("failed")));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.portone.io/v2/browser-sdk.js";
    script.async = true;
    script.dataset.portoneSdk = "true";
    script.onload = () => {
      if (window.PortOne) {
        resolve(window.PortOne);
      } else {
        reject(new Error("failed"));
      }
    };
    script.onerror = () => reject(new Error("failed"));
    document.head.appendChild(script);
  });
}

function CheckoutFrame({
  children,
  merchant,
}: {
  children: React.ReactNode;
  merchant?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <Logo />
        <LocaleSwitcher />
      </header>
      <div className="mx-auto w-full max-w-lg px-4 py-16">{children}</div>
      <div className="mt-auto border-t border-border">
        <LegalFooterLinks className="justify-center px-4 py-6 text-xs" />
        {merchant ? <div className="mx-auto max-w-6xl px-4 pb-8">{merchant}</div> : null}
      </div>
    </div>
  );
}
