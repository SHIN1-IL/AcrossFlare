"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isAdminSession, type PublicSession } from "@/lib/auth-types";
import { hydrateSession, setPreviewEmail } from "@/lib/session";

function isSafeNext(value: string | null): value is string {
  return Boolean(value && value.startsWith("/") && !value.startsWith("//"));
}

export function AuthForm({
  mode,
  productHint,
}: {
  mode: "login" | "signup";
  productHint?: string;
}) {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

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
                      : t("errorGeneric");
            setError(message);
            return;
          }

          setPreviewEmail(null);
          hydrateSession(data.user);
          router.refresh();

          const next = searchParams.get("next");
          const product = searchParams.get("product");
          const plan = searchParams.get("plan");

          if (isSafeNext(next)) {
            router.push(next);
            return;
          }

          if (isAdminSession(data.user)) {
            router.push("/admin");
            return;
          }

          if (product && plan) {
            router.push({ pathname: "/checkout", query: { product, plan } });
            return;
          }

          router.push("/app");
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

      <div className="space-y-2">
        <Label htmlFor="email">{t("email")}</Label>
        <Input
          id="email"
          name="email"
          type="text"
          autoComplete="username"
          placeholder="global-user@acrossflare.com"
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

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" disabled={pending} className="h-10 w-full rounded-[10px]">
        {mode === "login" ? t("submitLogin") : t("submitSignup")}
      </Button>

      <p className="font-mono text-xs text-muted-foreground">{t("demoHint")}</p>

      <Link
        href={mode === "login" ? "/signup" : "/login"}
        className="block text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        {mode === "login" ? t("switchToSignup") : t("switchToLogin")}
      </Link>
    </form>
  );
}
