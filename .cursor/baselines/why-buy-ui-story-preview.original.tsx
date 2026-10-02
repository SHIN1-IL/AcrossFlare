"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { HeroGrain } from "@/components/marketing/hero-grain";

const STEP_MS = 5800;
const LOOP_PAUSE_MS = 5000;

/** Extra services / sites often unreachable in China — fade toward bottom */
const EXTRA_SERVICES = [
  "Google",
  "Gmail",
  "Facebook",
  "Instagram",
  "X",
  "WhatsApp",
  "Telegram",
  "Wikipedia",
  "Spotify",
  "Slack",
  "Discord",
  "Reddit",
  "Zoom",
  "Teams",
] as const;

type StepId = "apps-blocked" | "wifi-risk" | "apps-ok" | "backup";

const STEPS: StepId[] = ["apps-blocked", "wifi-risk", "apps-ok", "backup"];

export function WhyBuyUiStoryPreview({ className }: { className?: string }) {
  const t = useTranslations("heroDeck");
  const items = readHeroItems(t);
  const [runId, setRunId] = useState(0);
  const [step, setStep] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [closing, setClosing] = useState(false);

  const captions: Record<StepId, string> = {
    "apps-blocked": items[0]?.q ?? "",
    "wifi-risk": items[4]?.q ?? "",
    "apps-ok": t("closing"),
    backup: items[2]?.q ?? "",
  };

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    setStep(0);
    setClosing(false);
    if (reduced) {
      setStep(STEPS.length - 1);
      setClosing(true);
      return;
    }
    const timers = STEPS.map((_, i) =>
      i === 0 ? null : window.setTimeout(() => setStep(i), STEP_MS * i)
    );
    const closeTimer = window.setTimeout(() => setClosing(true), STEP_MS * STEPS.length);
    const loopTimer = window.setTimeout(
      () => setRunId((n) => n + 1),
      STEP_MS * STEPS.length + LOOP_PAUSE_MS
    );
    return () => {
      timers.forEach((id) => id && window.clearTimeout(id));
      window.clearTimeout(closeTimer);
      window.clearTimeout(loopTimer);
    };
  }, [reduced, runId]);

  const stepId = STEPS[step] ?? "apps-blocked";

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">메인 2페이지 프리뷰 · UI 스토리 (문제 → 해결)</p>
        <button
          type="button"
          onClick={() => setRunId((n) => n + 1)}
          className="rounded-md border border-white/15 px-2.5 py-1 text-xs text-foreground/80 transition hover:bg-white/5"
        >
          다시 재생
        </button>
      </div>

      <div className="relative h-[min(86dvh,680px)] w-full overflow-hidden bg-[#14181e]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(226,232,240,0.07),transparent_34%,rgba(0,0,0,0.2)),repeating-linear-gradient(90deg,rgba(255,255,255,0.045)_0px,rgba(255,255,255,0.045)_1px,transparent_1px,transparent_5px)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.1),transparent_55%)]" />
        <HeroGrain />

        <style>{`
          @keyframes af-ui-fade-in {
            0% { opacity: 0; transform: translateY(8px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          @keyframes af-ui-pulse-badge {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.06); opacity: 0.85; }
          }
          @keyframes af-ui-bar {
            0% { transform: scaleX(0); }
            100% { transform: scaleX(1); }
          }
        `}</style>

        <div className="absolute inset-x-0 top-9 z-10 flex flex-col items-center px-4 text-center sm:top-11">
          <h1 className="text-[clamp(1.85rem,5.5vw,3rem)] leading-[0.95] font-semibold tracking-[-0.04em] text-[#f4f4f5]">
            AcrossFlare
          </h1>
          <p className="mt-2 text-[clamp(0.72rem,1.8vw,1rem)] whitespace-nowrap text-[#888888]">
            Secure Cloud & Network Optimization
          </p>
          <p className="mt-3 text-[clamp(0.8rem,1.6vw,1rem)] font-medium text-emerald-300/90">{t("headline")}</p>
        </div>

        <div className="absolute inset-x-0 top-[8.5rem] bottom-16 z-10 flex flex-col items-center justify-center px-4 sm:top-[9.25rem]">
          <div
            key={`${runId}-${stepId}`}
            className="w-full max-w-xl"
            style={reduced ? undefined : { animation: "af-ui-fade-in 0.55s ease-out both" }}
          >
            <DeviceMock step={stepId} t={t} items={items} animate={!reduced} />
          </div>

          <p className="mt-5 max-w-xl text-center text-[clamp(0.78rem,1.5vw,0.95rem)] leading-snug text-[#c8c8c8]">
            {captions[stepId]}
          </p>

          <div className="mt-4 flex gap-2">
            {STEPS.map((id, i) => (
              <span
                key={id}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-500",
                  i === step ? "w-8 bg-emerald-400" : i < step ? "w-3 bg-emerald-400/50" : "w-3 bg-white/15"
                )}
              />
            ))}
          </div>
        </div>

        <p
          className={cn(
            "absolute inset-x-0 bottom-5 z-10 text-center text-[clamp(0.8rem,1.6vw,1rem)] font-medium text-emerald-300 transition-all duration-500",
            closing ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
          )}
        >
          {t("closing")}
        </p>
      </div>
    </div>
  );
}

function DeviceMock({
  step,
  t,
  items,
  animate,
}: {
  step: StepId;
  t: ReturnType<typeof useTranslations>;
  items: HeroItem[];
  animate: boolean;
}) {
  return (
    <div className="mx-auto w-[min(100%,520px)]">
      {/* Fold 8–like: nearly square, slightly wider than tall */}
      <div className="relative rounded-[1.15rem] border-[3px] border-[#f4f4f5]/90 bg-[#0c0e14] p-[3px] shadow-[0_22px_56px_rgba(0,0,0,0.5)]">
        <div className="pointer-events-none absolute top-1/2 left-0 z-30 h-7 w-[2px] -translate-y-[120%] rounded-r-sm bg-[#c8c8c8]/40" />
        <div className="pointer-events-none absolute top-1/2 right-0 z-30 h-7 w-[2px] -translate-y-[120%] rounded-l-sm bg-[#c8c8c8]/40" />

        <div className="relative aspect-[5/4] overflow-hidden rounded-[0.85rem] bg-[#0c0e14]">
          {/* Soft curved crease — gradient only, no solid line */}
          <div
            className="pointer-events-none absolute inset-y-0 left-1/2 z-20 w-10 -translate-x-1/2"
            aria-hidden="true"
            style={{
              background:
                "radial-gradient(ellipse 70% 100% at 50% 50%, rgba(255,255,255,0.04) 0%, transparent 55%), linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.04) 30%, rgba(255,255,255,0.035) 45%, rgba(255,255,255,0.05) 50%, rgba(0,0,0,0.03) 55%, rgba(0,0,0,0.04) 70%, transparent 100%)",
            }}
          />

          <div className="relative z-10 flex h-7 items-end justify-between px-3.5 pb-0.5 text-[10px] text-[#c8c8c8]">
            <span className="font-medium">9:41</span>
            <span className="flex items-center gap-1.5">
              <span className="flex items-end gap-[1.5px]" aria-hidden="true">
                <span className="h-[3px] w-[2px] rounded-[0.5px] bg-[#c8c8c8]" />
                <span className="h-[5px] w-[2px] rounded-[0.5px] bg-[#c8c8c8]" />
                <span className="h-[7px] w-[2px] rounded-[0.5px] bg-[#c8c8c8]" />
                <span className="h-[9px] w-[2px] rounded-[0.5px] bg-[#c8c8c8]" />
              </span>
              <span className="text-[9px] font-semibold tracking-wide text-[#c8c8c8]">CMCC</span>
              <svg viewBox="0 0 16 12" className="h-[9px] w-3" fill="currentColor" aria-hidden="true">
                <path d="M1.5 3.5A1.5 1.5 0 0 1 3 2h8a1.5 1.5 0 0 1 1.5 1.5v.5H14a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1.5v.5A1.5 1.5 0 0 1 11 11H3A1.5 1.5 0 0 1 1.5 9.5v-6Z" opacity="0.35" />
                <path d="M8.5 5.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm2.5-1.2c.7.6 1.15 1.5 1.15 2.5s-.45 1.9-1.15 2.5l-.9-.85c.45-.4.75-1 .75-1.65s-.3-1.25-.75-1.65l.9-.85Zm1.85-1.75c1.15 1 1.9 2.45 1.9 4.1s-.75 3.1-1.9 4.1l-.9-.9c.9-.8 1.45-1.9 1.45-3.2S12.35 4.35 11.45 3.55l.9-.9Z" />
              </svg>
              <span className="flex items-center" aria-label="Battery 100%">
                <span className="relative flex h-[9px] w-[18px] items-center rounded-[2px] border border-[#c8c8c8]/90 px-[1px]">
                  <span className="h-[5px] w-full rounded-[1px] bg-emerald-400" />
                </span>
                <span className="ml-[1px] h-[4px] w-[1.5px] rounded-r-[1px] bg-[#c8c8c8]/90" />
              </span>
            </span>
          </div>

          {step === "apps-blocked" && <AppsGrid t={t} items={items} ok={false} animate={animate} />}
          {step === "wifi-risk" && <WifiPanel animate={animate} />}
          {step === "apps-ok" && <AppsGrid t={t} items={items} ok animate={animate} />}
          {step === "backup" && <BackupPanel t={t} animate={animate} />}
        </div>
      </div>
    </div>
  );
}

type HeroItem = { q: string; note?: string };

function readHeroItems(t: ReturnType<typeof useTranslations>): HeroItem[] {
  const value = t.raw("items");
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as { q?: unknown; note?: unknown };
      if (typeof row.q !== "string") return null;
      return {
        q: row.q,
        ...(typeof row.note === "string" ? { note: row.note } : {}),
      } satisfies HeroItem;
    })
    .filter((item): item is HeroItem => item !== null);
}

function AppsGrid({
  t,
  items,
  ok,
  animate,
}: {
  t: ReturnType<typeof useTranslations>;
  items: HeroItem[];
  ok: boolean;
  animate: boolean;
}) {
  const apps = primaryApps(t);

  return (
    <div className="flex h-[calc(100%-2rem)] gap-3 px-3 pb-3 pt-1">
      {/* Left pane */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-medium text-[#f4f4f5]">Apps</p>
          {ok ? (
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-semibold text-emerald-300">
              AcrossFlare
            </span>
          ) : (
            <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[9px] font-semibold text-red-300">
              Blocked
            </span>
          )}
        </div>
        <div className="grid flex-1 grid-cols-2 content-start gap-2">
          {apps.map((app, i) => (
            <div
              key={app.label}
              className="relative flex flex-col items-center justify-center rounded-xl border border-white/10 bg-[#12161c] py-4"
              style={
                animate && ok ? { animation: `af-ui-fade-in 0.45s ease-out ${i * 0.08}s both` } : undefined
              }
            >
              <span className={cn("rounded-lg px-2 py-0.5 text-[9px] font-bold", app.tone)}>{app.label}</span>
              <StatusBadge ok={ok} delay={i * 0.12} animate={animate} />
            </div>
          ))}
        </div>
        {ok ? (
          <p className="mt-2 shrink-0 text-center text-[10px] text-emerald-300">
            {t("connected")} · {t("noError")}
          </p>
        ) : (
          <p className="mt-2 shrink-0 text-center text-[10px] text-red-300/90">{items[0]?.note ?? ""}</p>
        )}
      </div>

      {/* Right pane */}
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="mb-2 text-[11px] font-medium text-[#f4f4f5]">Sites</p>
        <FadeServiceList variant={ok ? "ok" : "blocked"} animate={animate} />
      </div>
    </div>
  );
}

function primaryApps(t: ReturnType<typeof useTranslations>) {
  return [
    { label: t("kakao"), tone: "bg-[#fee500] text-black" },
    { label: t("lineApp"), tone: "bg-[#06c755] text-white" },
    { label: t("youtube"), tone: "bg-[#ff0000] text-white" },
    { label: t("netflix"), tone: "bg-[#e50914] text-white" },
  ];
}

function FadeServiceList({
  variant,
  animate,
}: {
  variant: "blocked" | "danger" | "ok";
  animate: boolean;
}) {
  const count = EXTRA_SERVICES.length;

  return (
    <div className="relative mt-2 min-h-0 flex-1 overflow-hidden">
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-12 bg-gradient-to-t from-[#0c0e14] to-transparent"
        aria-hidden="true"
      />
      <ul className="space-y-1 overflow-hidden pt-0.5">
        {EXTRA_SERVICES.map((name, i) => {
          const t = i / Math.max(1, count - 1);
          const opacity = 1 - t * 0.82;
          const blur = t * 1.1;
          return (
            <li
              key={name}
              className="flex items-center justify-between rounded-md border px-2 py-1"
              style={{
                opacity,
                filter: blur > 0.15 ? `blur(${blur}px)` : undefined,
                animation: animate ? `af-ui-fade-in 0.35s ease-out ${0.05 + i * 0.04}s both` : undefined,
                borderColor:
                  variant === "ok"
                    ? "rgba(16,185,129,0.22)"
                    : variant === "danger"
                      ? "rgba(239,68,68,0.35)"
                      : "rgba(239,68,68,0.25)",
                backgroundColor:
                  variant === "ok"
                    ? "rgba(16,185,129,0.06)"
                    : variant === "danger"
                      ? "rgba(127,29,29,0.35)"
                      : "rgba(127,29,29,0.2)",
              }}
            >
              <span
                className={cn(
                  "truncate text-[9px] font-medium",
                  variant === "ok" ? "text-emerald-100/90" : "text-red-100/90"
                )}
              >
                {name}
              </span>
              <span
                className={cn(
                  "shrink-0 text-[9px] font-bold",
                  variant === "ok" ? "text-emerald-400" : "text-red-400"
                )}
              >
                {variant === "ok" ? "✓" : "✕"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function StatusBadge({ ok, delay, animate }: { ok: boolean; delay: number; animate: boolean }) {
  return (
    <span
      className={cn(
        "absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white",
        ok ? "bg-emerald-500" : "bg-red-500"
      )}
      style={animate ? { animation: `af-ui-pulse-badge 1.2s ease-in-out ${delay}s infinite` } : undefined}
    >
      {ok ? "✓" : "✕"}
    </span>
  );
}

function WifiPanel({ animate }: { animate: boolean }) {
  return (
    <div className="flex h-[calc(100%-2rem)] gap-3 px-3 pb-3 pt-1">
      {/* Left pane — connection */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-medium text-[#f4f4f5]">Wi‑Fi</p>
          <span className="rounded-full bg-red-600/25 px-2 py-0.5 text-[9px] font-semibold text-red-200">
            Unsecured
          </span>
        </div>
        <div className="flex flex-1 flex-col rounded-xl border border-red-500/45 bg-[#12161c] p-3">
          <p className="text-[12px] font-semibold text-[#f4f4f5]">Hotel_Guest</p>
          <p className="mt-1 text-[10px] font-medium text-red-300">Connected · Unsecured</p>
          <div className="mt-6 flex flex-1 items-center justify-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="rounded-full bg-red-400/85"
                style={{
                  width: 12 + i * 8,
                  height: 12 + i * 8,
                  animation: animate ? `af-ui-pulse-badge 1.4s ease-in-out ${i * 0.15}s infinite` : undefined,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Right pane — warning */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2.5">
        <div
          className="rounded-xl border border-red-500/55 bg-red-950/60 px-3 py-4 text-center"
          style={animate ? { animation: "af-ui-fade-in 0.5s ease-out 0.2s both" } : undefined}
        >
          <p className="text-[12px] font-bold leading-snug text-red-100">이 Wi‑Fi는 안전하지 않습니다</p>
          <p className="mt-2 text-[9px] leading-snug text-red-200/85">Traffic not encrypted on this network</p>
        </div>
        <div
          className="flex items-center gap-2 rounded-xl border border-red-500/35 bg-red-950/40 px-2.5 py-2.5"
          style={animate ? { animation: "af-ui-fade-in 0.5s ease-out 0.35s both" } : undefined}
        >
          <span className="text-[14px] text-red-400" aria-hidden="true">
            ⚠
          </span>
          <p className="text-[10px] leading-snug text-red-200/90">Public hotel Wi‑Fi · risk of interception</p>
        </div>
      </div>
    </div>
  );
}

function BackupPanel({ t, animate }: { t: ReturnType<typeof useTranslations>; animate: boolean }) {
  return (
    <div className="flex h-[calc(100%-2rem)] gap-3 px-3 pb-3 pt-1">
      {/* Left pane — Vaultwarden 금고 열기 */}
      <div
        className="flex min-w-0 flex-1 flex-col rounded-xl border border-white/10 bg-[#161a22] p-2.5"
        style={animate ? { animation: "af-ui-fade-in 0.4s ease-out both" } : undefined}
      >
        <p className="text-[11px] font-semibold leading-snug text-[#f4f4f5]">
          Vaultwarden
          <span className="mt-0.5 block text-[9px] font-normal text-[#a1a1aa]">암호·메모 백업</span>
        </p>
        <p className="mt-1.5 text-[8px] leading-snug text-[#8b8b93]">
          금고 열기를 누르면 로그인 화면으로 이동합니다.
        </p>
        <div className="mt-2 space-y-1.5">
          <VaultField label="Vault URL" value="https://vault.acrossflare.com" animate={animate} delay={0.15} />
          <VaultField label="Vault 사용자" value="you@acrossflare.com" animate={animate} delay={0.25} />
        </div>
        <button
          type="button"
          tabIndex={-1}
          className="mt-auto w-full rounded-lg bg-[#5eead4] py-2 text-center text-[11px] font-semibold text-[#0a0c12]"
          style={
            animate
              ? {
                  animation:
                    "af-ui-fade-in 0.45s ease-out 0.4s both, af-ui-pulse-badge 1.8s ease-in-out 1s infinite",
                }
              : undefined
          }
        >
          금고 열기
        </button>
      </div>

      {/* Right pane — 기존 파일 백업 */}
      <div
        className="flex min-w-0 flex-1 flex-col rounded-xl border border-emerald-500/30 bg-[#12161c] p-2.5"
        style={animate ? { animation: "af-ui-fade-in 0.4s ease-out 0.15s both" } : undefined}
      >
        <p className="text-[11px] font-semibold text-emerald-300">{t("backup")}</p>
        <p className="mt-0.5 text-[9px] text-muted-foreground">{t("dropHint")}</p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full origin-left rounded-full bg-emerald-400"
            style={{
              transform: animate ? undefined : "scaleX(1)",
              animation: animate ? "af-ui-bar 2s ease-out forwards" : undefined,
            }}
          />
        </div>
        <div className="mt-3 space-y-1.5">
          <FileRow name={t("fileName")} done animate={animate} delay={0.35} />
          <FileRow name={t("memo")} done animate={animate} delay={0.55} />
        </div>
        <p
          className="mt-auto pt-1 text-center text-[10px] font-medium text-emerald-300"
          style={animate ? { animation: "af-ui-fade-in 0.45s ease-out 1.6s both" } : undefined}
        >
          {t("connected")}
        </p>
      </div>
    </div>
  );
}

function VaultField({
  label,
  value,
  animate,
  delay,
}: {
  label: string;
  value: string;
  animate: boolean;
  delay: number;
}) {
  return (
    <div style={animate ? { animation: `af-ui-fade-in 0.35s ease-out ${delay}s both` } : undefined}>
      <p className="mb-0.5 text-[8px] font-medium text-[#a1a1aa]">{label}</p>
      <div className="flex items-center gap-1 rounded-md border border-white/10 bg-[#0c0e14] px-1.5 py-1">
        <span className="min-w-0 flex-1 truncate text-[9px] text-[#e4e4e7]">{value}</span>
        <svg
          viewBox="0 0 24 24"
          className="size-3 shrink-0 text-[#a1a1aa]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <rect x="9" y="9" width="11" height="11" rx="2" />
          <path d="M5 15V5a2 2 0 0 1 2-2h10" />
        </svg>
      </div>
    </div>
  );
}

function FileRow({
  name,
  done,
  animate,
  delay,
}: {
  name: string;
  done?: boolean;
  animate: boolean;
  delay: number;
}) {
  return (
    <div
      className="flex items-center justify-between rounded-lg border border-white/10 bg-[#0a0c12] px-2 py-1"
      style={animate ? { animation: `af-ui-fade-in 0.4s ease-out ${delay}s both` } : undefined}
    >
      <span className="truncate text-[9px] text-[#e4e4e7]">{name}</span>
      {done ? <span className="text-[9px] text-emerald-400">✓</span> : null}
    </div>
  );
}
