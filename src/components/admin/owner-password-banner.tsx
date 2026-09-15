"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function OwnerPasswordBanner() {
  const t = useTranslations("admin");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  return (
    <div className="border-b border-border bg-surface px-4 py-4 md:px-8">
      <form
        className="mx-auto flex max-w-3xl flex-col gap-3"
        onSubmit={async (event) => {
          event.preventDefault();
          setSaved(false);
          if (next !== confirm) {
            setError(t("passwordMismatch"));
            return;
          }

          setPending(true);
          setError("");
          try {
            const response = await fetch("/api/v1/account/password", {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ current, next }),
            });
            const data = (await response.json().catch(() => null)) as { error?: string } | null;
            if (!response.ok) {
              setError(
                data?.error === "invalid_credentials"
                  ? t("passwordInvalid")
                  : data?.error === "weak_password"
                    ? t("passwordWeak")
                    : t("passwordError")
              );
              return;
            }
            setCurrent("");
            setNext("");
            setConfirm("");
            setSaved(true);
          } catch {
            setError(t("passwordError"));
          } finally {
            setPending(false);
          }
        }}
      >
        <p className="text-sm font-medium text-foreground">{t("passwordBannerTitle")}</p>
        <p className="text-xs leading-5 text-muted-foreground">{t("passwordBannerHint")}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="owner-password-current">{t("passwordCurrent")}</Label>
            <Input
              id="owner-password-current"
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(event) => setCurrent(event.target.value)}
              className="h-9 rounded-[10px]"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="owner-password-next">{t("passwordNext")}</Label>
            <Input
              id="owner-password-next"
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(event) => setNext(event.target.value)}
              className="h-9 rounded-[10px]"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="owner-password-confirm">{t("passwordConfirm")}</Label>
            <Input
              id="owner-password-confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              className="h-9 rounded-[10px]"
            />
          </div>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {saved ? <p className="text-sm text-primary">{t("passwordSaved")}</p> : null}
        <Button type="submit" disabled={pending} className="h-9 w-fit rounded-[10px]">
          {t("passwordSubmit")}
        </Button>
      </form>
    </div>
  );
}
