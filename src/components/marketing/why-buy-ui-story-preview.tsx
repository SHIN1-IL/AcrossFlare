"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { HOME_STORY_HEIGHT } from "@/lib/board-art";
import { HeroGrain } from "@/components/marketing/hero-grain";
import { MotherboardEdgeBackdrop } from "@/components/marketing/motherboard-edge-backdrop";
import { StoryDeviceFrame, StoryDevicePanes } from "@/components/marketing/story-device-frame";
import {
  StoryTouchHighlight,
  storyTouchTargetClass,
  useStoryTouchCycle,
  type StoryTouchTiming,
} from "@/components/marketing/story-touch-cue";
import { useStoryAutoplay } from "@/components/marketing/use-story-autoplay";

const LOOP_PAUSE_MS = 2800;

type StepId = "apps-blocked" | "wifi-risk" | "apps-ok" | "backup";

const STEPS: StepId[] = ["apps-blocked", "wifi-risk", "apps-ok", "backup"];

/** Per-step settle: show UI first (~1.5s+), then one press. */
const TOUCH_TIMING: Record<StepId, StoryTouchTiming> = {
  "apps-blocked": { settleMs: 1500 },
  "wifi-risk": { settleMs: 1600 },
  "apps-ok": { settleMs: 1500 },
  /** Vault fields fade in; press Open vault after they settle. */
  backup: { settleMs: 2000 },
};

export function WhyBuyUiStoryPreview({
  className,
  live = false,
}: {
  className?: string;
  /** Full-bleed home deck section — one viewport, autoplay in view. */
  live?: boolean;
}) {
  const t = useTranslations("heroDeck");
  const items = readHeroItems(t);
  const {
    sectionRef,
    step: liveStep,
    runId: liveRunId,
    armed: liveArmed,
    finished: liveFinished,
    animate: liveAnimate,
    nextStep,
    replay,
  } = useStoryAutoplay(STEPS.length);
  const [devRunId, setDevRunId] = useState(0);
  const [timedStep, setTimedStep] = useState(0);
  const [devReduced, setDevReduced] = useState(false);
  const [devFinished, setDevFinished] = useState(false);

  const captions: Record<StepId, string> = {
    "apps-blocked": items[0]?.q ?? "",
    "wifi-risk": items[4]?.q ?? "",
    "apps-ok": t("closing"),
    backup: t("backupCaption"),
  };

  useEffect(() => {
    if (live) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setDevReduced(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [live]);

  useEffect(() => {
    if (live) return;
    setTimedStep(0);
    setDevFinished(false);
    if (devReduced) {
      setTimedStep(STEPS.length - 1);
      setDevFinished(true);
    }
  }, [live, devReduced, devRunId]);

  const step = live ? liveStep : timedStep;
  const runId = live ? liveRunId : devRunId;
  const armed = live ? liveArmed : true;
  const finished = live ? liveFinished : devFinished;
  const animate = live ? liveAnimate : !devReduced && !devFinished;
  const stepId = STEPS[step] ?? "apps-blocked";
  const closing = step >= STEPS.length - 1;

  const advanceStep = useCallback(() => {
    if (live) {
      nextStep();
      return;
    }
    setTimedStep((current) => {
      if (current >= STEPS.length - 1) {
        setDevFinished(true);
        window.setTimeout(() => setDevRunId((n) => n + 1), LOOP_PAUSE_MS);
        return current;
      }
      return current + 1;
    });
  }, [live, nextStep]);

  const stage = (
    <div
      className={cn(
        "relative flex w-full flex-col overflow-hidden bg-[#14181e]",
        live ? "h-full" : "h-[min(86dvh,680px)]"
      )}
    >
      <MotherboardEdgeBackdrop />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(226,232,240,0.04),transparent_34%,rgba(0,0,0,0.16)),repeating-linear-gradient(90deg,rgba(255,255,255,0.03)_0px,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_5px)]" />
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

      <div className="relative z-10 flex shrink-0 flex-col items-center px-4 pt-8 text-center max-[479px]:pt-5 sm:pt-10">
        <h1 className="text-[clamp(1.55rem,4.5vw,2.5rem)] leading-[0.95] font-semibold tracking-[-0.04em] text-[#f4f4f5] max-[479px]:text-[1.35rem]">
          AcrossFlare
        </h1>
        <p className="mt-1.5 text-[clamp(0.68rem,1.6vw,0.9rem)] whitespace-nowrap text-[#888888] max-[479px]:hidden">
          {t("brandTagline")}
        </p>
        <p className="mt-2 text-[clamp(0.75rem,1.5vw,0.95rem)] font-medium text-emerald-300/90 max-[479px]:mt-1 max-[479px]:text-[0.75rem]">
          {t("headline")}
        </p>
      </div>

      <div className="relative z-10 mx-auto mt-3 min-h-0 w-full max-w-2xl flex-1 px-3 max-[479px]:mt-2 max-[479px]:max-w-none">
        <div
          key={`${runId}-${stepId}-${armed ? "on" : "off"}`}
          className="h-full w-full"
          style={animate ? { animation: "af-ui-fade-in 0.55s ease-out both" } : undefined}
        >
          <DeviceMock
            step={stepId}
            t={t}
            items={items}
            animate={animate}
            touchKey={`${runId}-${stepId}`}
            shineKey={runId}
            touchTiming={TOUCH_TIMING[stepId]}
            onTouchDone={advanceStep}
          />
        </div>
      </div>

      <div className="relative z-10 flex shrink-0 flex-col items-center px-4 pt-3 pb-5 max-[479px]:pt-2 max-[479px]:pb-4">
        <p className="max-w-xl text-center text-[clamp(0.78rem,1.5vw,0.95rem)] leading-snug text-[#c8c8c8] max-[479px]:text-[0.78rem]">
          {captions[stepId]}
        </p>
        <div className="mt-3 flex gap-2 max-[479px]:mt-2">
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
        <p
          className={cn(
            "mt-2 text-center text-[clamp(0.75rem,1.4vw,0.9rem)] font-medium text-emerald-300 transition-all duration-500 max-[479px]:text-[0.75rem]",
            closing ? "translate-y-0 opacity-100" : "h-0 overflow-hidden opacity-0"
          )}
        >
          {t("closing")}
        </p>
      </div>
    </div>
  );

  if (live) {
    return (
      <section
        ref={sectionRef}
        data-home-page
        className={cn(
          "relative snap-start bg-[#14181e] max-md:snap-start",
          HOME_STORY_HEIGHT.whyBuyLive,
          className
        )}
      >
        <div
          className="h-dvh cursor-pointer overflow-hidden"
          role="button"
          tabIndex={0}
          aria-label={finished ? t("replayPreview") : t("headline")}
          onClick={() => {
            if (finished) replay();
          }}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && finished) {
              e.preventDefault();
              replay();
            }
          }}
        >
          {stage}
        </div>
      </section>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">메인 2페이지 프리뷰 · UI 스토리 (문제 → 해결)</p>
        <button
          type="button"
          onClick={() => setDevRunId((n) => n + 1)}
          className="rounded-md border border-white/15 px-2.5 py-1 text-xs text-foreground/80 transition hover:bg-white/5"
        >
          다시 재생
        </button>
      </div>
      {stage}
    </div>
  );
}

function DeviceMock({
  step,
  t,
  items,
  animate,
  touchKey,
  shineKey,
  touchTiming,
  onTouchDone,
}: {
  step: StepId;
  t: ReturnType<typeof useTranslations>;
  items: HeroItem[];
  animate: boolean;
  touchKey: string;
  shineKey: string | number;
  touchTiming: StoryTouchTiming;
  onTouchDone: () => void;
}) {
  const touch = useStoryTouchCycle(animate, touchKey, onTouchDone, touchTiming);

  return (
    <StoryDeviceFrame shineKey={shineKey}>
      {step === "apps-blocked" && (
        <AppsGrid t={t} items={items} ok={false} animate={animate} touch={touch} />
      )}
      {step === "wifi-risk" && <WifiPanel t={t} animate={animate} touch={touch} />}
      {step === "apps-ok" && <AppsGrid t={t} items={items} ok animate={animate} touch={touch} />}
      {step === "backup" && <BackupPanel t={t} animate={animate} touch={touch} />}
    </StoryDeviceFrame>
  );
}

type TouchCycle = ReturnType<typeof useStoryTouchCycle>;

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

function readExtraSites(t: ReturnType<typeof useTranslations>): string[] {
  const value = t.raw("extraSites");
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function AppsGrid({
  t,
  items,
  ok,
  animate,
  touch,
}: {
  t: ReturnType<typeof useTranslations>;
  items: HeroItem[];
  ok: boolean;
  animate: boolean;
  touch: TouchCycle;
}) {
  const apps = primaryApps(t);

  return (
    <StoryDevicePanes>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-medium text-[#f4f4f5]">{t("apps")}</p>
          {ok ? (
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-semibold text-emerald-300">
              AcrossFlare
            </span>
          ) : (
            <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[9px] font-semibold text-red-300">
              {t("blocked")}
            </span>
          )}
        </div>
        <div className="grid flex-1 grid-cols-2 content-start gap-2">
          {apps.map((app, i) => (
            <div
              key={app.label}
              className={cn(
                "relative flex flex-col items-center justify-center rounded-xl border border-white/10 bg-[#12161c] py-4",
                i === 0 && storyTouchTargetClass(touch.pressed)
              )}
              style={
                animate && ok ? { animation: `af-ui-fade-in 0.45s ease-out ${i * 0.08}s both` } : undefined
              }
            >
              <span className={cn("rounded-lg px-2 py-0.5 text-[9px] font-bold", app.tone)}>{app.label}</span>
              <StatusBadge ok={ok} delay={i * 0.12} animate={animate} />
              {i === 0 ? (
                <StoryTouchHighlight
                  visible={touch.visible}
                  pressed={touch.pressed}
                  nudge={touch.nudge}
                />
              ) : null}
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

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <p className="mb-2 text-[11px] font-medium text-[#f4f4f5]">{t("sites")}</p>
        <FadeServiceList variant={ok ? "ok" : "blocked"} animate={animate} />
      </div>
    </StoryDevicePanes>
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
  const t = useTranslations("heroDeck");
  const sites = readExtraSites(t);
  const count = sites.length;

  return (
    <div className="relative mt-2 min-h-0 flex-1 overflow-hidden">
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-12 bg-gradient-to-t from-[#0c0e14] to-transparent"
        aria-hidden="true"
      />
      <ul className="space-y-1 overflow-hidden pt-0.5">
        {sites.map((name, i) => {
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
        "absolute top-1.5 right-1.5 z-10 flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white",
        ok ? "bg-emerald-500" : "bg-red-500"
      )}
      style={animate ? { animation: `af-ui-pulse-badge 1.2s ease-in-out ${delay}s infinite` } : undefined}
    >
      {ok ? "✓" : "✕"}
    </span>
  );
}

function WifiPanel({
  t,
  animate,
  touch,
}: {
  t: ReturnType<typeof useTranslations>;
  animate: boolean;
  touch: TouchCycle;
}) {
  return (
    <StoryDevicePanes>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-medium text-[#f4f4f5]">{t("wifiLabel")}</p>
          <span className="rounded-full bg-red-600/25 px-2 py-0.5 text-[9px] font-semibold text-red-200">
            {t("unsecured")}
          </span>
        </div>
        <div
          className={cn(
            "relative flex flex-1 flex-col rounded-xl border border-red-500/45 bg-[#12161c] p-3",
            storyTouchTargetClass(touch.pressed)
          )}
        >
          <p className="text-[12px] font-semibold text-[#f4f4f5]">{t("wifiNetwork")}</p>
          <p className="mt-1 text-[10px] font-medium text-red-300">{t("connectedUnsecured")}</p>
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
          <StoryTouchHighlight
            visible={touch.visible}
            pressed={touch.pressed}
            nudge={touch.nudge}
          />
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center gap-2.5">
        <div
          className="rounded-xl border border-red-500/55 bg-red-950/60 px-3 py-4 text-center"
          style={animate ? { animation: "af-ui-fade-in 0.5s ease-out 0.2s both" } : undefined}
        >
          <p className="text-[12px] font-bold leading-snug text-red-100">{t("wifiUnsafeTitle")}</p>
          <p className="mt-2 text-[9px] leading-snug text-red-200/85">{t("wifiUnsafeBody")}</p>
        </div>
        <div
          className="flex items-center gap-2 rounded-xl border border-red-500/35 bg-red-950/40 px-2.5 py-2.5"
          style={animate ? { animation: "af-ui-fade-in 0.5s ease-out 0.35s both" } : undefined}
        >
          <span className="text-[14px] text-red-400" aria-hidden="true">
            ⚠
          </span>
          <p className="text-[10px] leading-snug text-red-200/90">{t("wifiRiskNote")}</p>
        </div>
      </div>
    </StoryDevicePanes>
  );
}

function BackupPanel({
  t,
  animate,
  touch,
}: {
  t: ReturnType<typeof useTranslations>;
  animate: boolean;
  touch: TouchCycle;
}) {
  return (
    <StoryDevicePanes>
      <div
        className="flex min-h-0 min-w-0 flex-1 flex-col rounded-xl border border-white/10 bg-[#161a22] p-2.5"
        style={animate ? { animation: "af-ui-fade-in 0.4s ease-out both" } : undefined}
      >
        <p className="text-[11px] font-semibold leading-snug text-[#f4f4f5]">
          {t("vaultwarden")}
          <span className="mt-0.5 block text-[9px] font-normal text-[#a1a1aa]">{t("vaultSubtitle")}</span>
        </p>
        <p className="mt-1.5 text-[8px] leading-snug text-[#8b8b93]">{t("vaultOpenHint")}</p>
        <div className="mt-2 space-y-1.5">
          <VaultField label={t("vaultUrl")} value="https://vault.acrossflare.com" animate={animate} delay={0.15} />
          <VaultField label={t("vaultUser")} value="you@acrossflare.com" animate={animate} delay={0.25} />
        </div>
        <button
          type="button"
          tabIndex={-1}
          className={cn(
            "relative mt-auto w-full rounded-lg bg-[#5eead4] py-2 text-center text-[11px] font-semibold text-[#0a0c12]",
            storyTouchTargetClass(touch.pressed)
          )}
          style={
            animate
              ? {
                  animation: "af-ui-fade-in 0.45s ease-out 0.4s both",
                }
              : undefined
          }
        >
          {t("openVault")}
          <StoryTouchHighlight
            visible={touch.visible}
            pressed={touch.pressed}
            nudge={touch.nudge}
          />
        </button>
      </div>

      <div
        className="flex min-h-0 min-w-0 flex-1 flex-col rounded-xl border border-emerald-500/30 bg-[#12161c] p-2.5"
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
    </StoryDevicePanes>
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
