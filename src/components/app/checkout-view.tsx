"use client";

import { Check, LoaderCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PaymentTabs } from "@/components/app/payment-tabs";
import { LocaleSwitcher } from "@/components/marketing/locale-switcher";
import { Logo } from "@/components/marketing/logo";
import { Button, buttonVariants } from "@/components/ui/button";
import { useAccount, useHydrated } from "@/hooks/use-account";
import { Link, useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { type PaymentMethod } from "@/lib/account";
import { provisionProduct, refreshRemoteAccount } from "@/lib/account-store";
import { formatPrimaryPrice, formatSecondaryPrice } from "@/lib/format-price";
import { useLivePlan } from "@/hooks/use-admin";
import { isProductId } from "@/lib/plans";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: "payment", key: "stepPayment" },
  { id: "xui", key: "stepXui" },
  { id: "backup", key: "stepBackup" },
  { id: "ready", key: "stepReady" },
] as const;

export function CheckoutView({
  product,
  planId,
  paymentId,
  canceled = false,
  merchant,
}: {
  product?: string;
  planId?: string;
  paymentId?: string;
  canceled?: boolean;
  merchant?: React.ReactNode;
}) {
  const t = useTranslations("checkout");
  const tApp = useTranslations("app");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const hydrated = useHydrated();
  const { session } = useAccount();
  const plan = useLivePlan(planId);
  const validProduct = isProductId(product) && plan?.product === product ? product : null;
  const [method, setMethod] = useState<PaymentMethod>(locale === "zh" ? "alipay" : "card");
  const [phase, setPhase] = useState<"form" | "processing" | "provisioning">(
    paymentId && !canceled ? "processing" : "form"
  );
  const [step, setStep] = useState(0);
  const [error, setError] = useState<"failed" | "timeout" | null>(canceled ? "failed" : null);
  const resumeRef = useRef(false);

  const steps = useMemo(
    () =>
      validProduct === "marketing"
        ? STEPS.filter((item) => item.id !== "backup")
        : [...STEPS],
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
      await refreshRemoteAccount();
      if (session && validProduct && plan) {
        provisionProduct(session.email, validProduct, plan.id, method);
        router.push(validProduct === "global" ? "/app/global" : "/app/marketing");
      }
    },
    [method, plan, router, session, steps, validProduct]
  );

  async function startPayment() {
    if (!validProduct || !plan) {
      return;
    }

    setError(null);
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
        }),
      });
      const checkout = (await created.json()) as {
        paymentId?: string;
        mode?: string;
        error?: string;
        redirectUrl?: string;
        portone?: PortOneCheckout;
      };
      if (!created.ok || !checkout.paymentId) {
        throw new Error("failed");
      }

      if (checkout.mode === "simulate") {
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
        window.location.assign(checkout.redirectUrl);
        return;
      }

      if (checkout.portone) {
        const result = await requestPortOnePayment(checkout.portone);
        if (result === "redirect") {
          return;
        }
        await finishPaidCheckout(checkout.paymentId);
        return;
      }

      throw new Error("failed");
    } catch (cause) {
      setPhase("form");
      setError(cause instanceof Error && cause.message === "timeout" ? "timeout" : "failed");
    }
  }

  useEffect(() => {
    if (canceled || !paymentId || resumeRef.current || !hydrated || !session || !validProduct || !plan) {
      return;
    }

    resumeRef.current = true;
    void finishPaidCheckout(paymentId).catch((cause: unknown) => {
      setPhase("form");
      setError(cause instanceof Error && cause.message === "timeout" ? "timeout" : "failed");
    });
  }, [canceled, finishPaidCheckout, hydrated, paymentId, plan, session, validProduct]);

  useEffect(() => {
    if (hydrated && !session) {
      router.replace({
        pathname: "/login",
        query: {
          next: `/checkout?product=${product ?? ""}&plan=${planId ?? ""}${paymentId ? `&paymentId=${paymentId}` : ""}`,
        },
      });
    }
  }, [hydrated, paymentId, planId, product, router, session]);

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

  const secondary = formatSecondaryPrice(locale, plan.prices);

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
              {validProduct === "global" ? tApp("global") : tApp("marketing")} · {plan.name}
            </p>
            <p className="mt-2 font-mono text-3xl tracking-tight">
              {formatPrimaryPrice(locale, plan.prices)}
            </p>
            {secondary ? (
              <p className="mt-1 font-mono text-xs text-muted-foreground">{secondary}</p>
            ) : null}
          </div>
        </div>

        {phase === "form" ? (
          <div className="mt-6 space-y-5">
            <PaymentTabs value={method} onChange={setMethod} />
            {error ? (
              <p className="text-sm text-destructive">
                {error === "timeout" ? t("payTimeout") : t("payFailed")}
              </p>
            ) : null}
            <Button
              type="button"
              className="h-10 w-full rounded-[10px]"
              onClick={() => {
                void startPayment();
              }}
            >
              {t("pay")}
            </Button>
          </div>
        ) : null}

        {phase === "processing" ? (
          <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin text-primary" />
            {t("processing")}
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

type PortOneCheckout = {
  storeId: string;
  channelKey: string;
  paymentId: string;
  orderName: string;
  totalAmount: number;
  currency: string;
  payMethod: "CARD" | "ALIPAY";
  redirectUrl: string;
};

type PortOneSdk = {
  requestPayment: (input: {
    storeId: string;
    channelKey: string;
    paymentId: string;
    orderName: string;
    totalAmount: number;
    currency: string;
    payMethod: "CARD" | "ALIPAY";
    redirectUrl: string;
  }) => Promise<{ code?: string } | null>;
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
  const tFooter = useTranslations("footer");

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <Logo />
        <LocaleSwitcher />
      </header>
      <div className="mx-auto w-full max-w-lg px-4 py-16">{children}</div>
      <div className="mt-auto border-t border-border">
        <nav className="flex flex-wrap justify-center gap-4 px-4 py-6 text-xs text-muted-foreground">
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
        </nav>
        {merchant ? <div className="mx-auto max-w-6xl px-4 pb-8">{merchant}</div> : null}
      </div>
    </div>
  );
}
