"use client";

import { MessageCircle, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState, type FormEvent } from "react";

type Turn = { role: "user" | "assistant"; text: string };

export function SupportChat() {
  const t = useTranslations("support.chat");
  const locale = useLocale();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function send(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || pending) return;

    const next = [...turns, { role: "user" as const, text }].slice(-8);
    setTurns(next);
    setDraft("");
    setPending(true);
    setNotice(null);

    try {
      const response = await fetch("/api/v1/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, messages: next }),
      });
      const data = (await response.json()) as { reply?: string; error?: string };
      if (!response.ok || !data.reply) {
        const key = data.error === "rate" || data.error === "unconfigured" ? data.error : "error";
        setNotice(t(key));
        return;
      }
      const reply = data.reply;
      setTurns((current) => [...current, { role: "assistant" as const, text: reply }].slice(-8));
    } catch {
      setNotice(t("error"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 flex flex-col items-end gap-3">
      {open ? (
        <section
          id={panelId}
          aria-label={t("title")}
          className="flex w-[min(100vw-2rem,22rem)] flex-col overflow-hidden rounded-2xl border border-border bg-[#14181e] shadow-[0_18px_60px_-24px_rgba(16,185,129,0.55)]"
        >
          <header className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-medium">{t("title")}</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{t("lead")}</p>
          </header>
          <div className="flex max-h-[min(50dvh,22rem)] flex-col gap-2 overflow-y-auto px-4 py-3">
            {turns.map((turn, index) => (
              <p
                key={`${turn.role}-${index}`}
                className={
                  turn.role === "user"
                    ? "ml-8 rounded-2xl bg-primary px-3 py-2 text-sm leading-6 text-primary-foreground"
                    : "mr-6 rounded-2xl bg-card px-3 py-2 text-sm leading-6 text-card-foreground"
                }
              >
                {turn.text}
              </p>
            ))}
            {pending ? <p className="text-xs text-muted-foreground">{t("thinking")}</p> : null}
            {notice ? (
              <p role="status" className="text-xs leading-5 text-muted-foreground">
                {notice}
              </p>
            ) : null}
          </div>
          <form onSubmit={send} className="flex gap-2 border-t border-border p-3">
            <label className="sr-only" htmlFor={`${panelId}-input`}>
              {t("placeholder")}
            </label>
            <input
              id={`${panelId}-input`}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={t("placeholder")}
              maxLength={800}
              className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <button
              type="submit"
              disabled={pending || draft.trim().length === 0}
              className="rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {t("send")}
            </button>
          </form>
        </section>
      ) : null}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
      >
        {open ? <X aria-hidden="true" /> : <MessageCircle aria-hidden="true" />}
        <span className="sr-only">{open ? t("close") : t("open")}</span>
      </button>
    </div>
  );
}
