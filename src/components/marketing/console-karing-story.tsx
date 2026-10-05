"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { HeroGrain } from "@/components/marketing/hero-grain";
import { MotherboardEdgeBackdrop } from "@/components/marketing/motherboard-edge-backdrop";
import { StoryDeviceFrame, StoryDevicePanes } from "@/components/marketing/story-device-frame";

type StepId =
  | "console-click"
  | "qr-scan"
  | "karing-tap"
  | "karing-on"
  | "vault-login"
  | "vault-backup";

const STEPS: StepId[] = [
  "console-click",
  "qr-scan",
  "karing-tap",
  "karing-on",
  "vault-login",
  "vault-backup",
];

const HEADLINE_KEYS: Record<StepId, string> = {
  "console-click": "headlines.consoleClick",
  "qr-scan": "headlines.qrScan",
  "karing-tap": "headlines.karingTap",
  "karing-on": "headlines.karingOn",
  "vault-login": "headlines.vaultLogin",
  "vault-backup": "headlines.vaultBackup",
};

const CAPTION_KEYS: Record<StepId, string> = {
  "console-click": "captions.consoleClick",
  "qr-scan": "captions.qrScan",
  "karing-tap": "captions.karingTap",
  "karing-on": "captions.karingOn",
  "vault-login": "captions.vaultLogin",
  "vault-backup": "captions.vaultBackup",
};

type StoryT = ReturnType<typeof useTranslations>;
type HeroT = ReturnType<typeof useTranslations>;

/**
 * Sticky scroll story (same device frame as page 2):
 * console tap → QR scan → Karing red→green → Vaultwarden login → backup vault.
 * Personal details masked as OO. Scroll or tap advances steps.
 */
export function ConsoleKaringStory({ className }: { className?: string }) {
  const t = useTranslations("consoleStory");
  const tHero = useTranslations("heroDeck");
  const sectionRef = useRef<HTMLElement>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const [progress, setProgress] = useState(0);
  const [armed, setArmed] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const onScroll = () => {
      const rect = section.getBoundingClientRect();
      const total = section.offsetHeight - window.innerHeight;
      if (rect.top < window.innerHeight * 0.55) setArmed(true);
      if (total <= 0) {
        setProgress(1);
        return;
      }
      setProgress(Math.min(1, Math.max(0, -rect.top / total)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const step = reduced
    ? STEPS.length - 1
    : Math.min(STEPS.length - 1, Math.floor(progress * STEPS.length + 0.001));
  const stepId = STEPS[step] ?? "console-click";
  const animate = !reduced && armed;

  function goToStep(next: number) {
    const section = sectionRef.current;
    if (!section) return;
    const clamped = Math.max(0, Math.min(STEPS.length - 1, next));
    const total = section.offsetHeight - window.innerHeight;
    if (total <= 0) return;
    const target = section.offsetTop + (total * (clamped + 0.08)) / STEPS.length;
    window.scrollTo({ top: target, behavior: "smooth" });
  }

  function onStageActivate() {
    if (step >= STEPS.length - 1) return;
    goToStep(step + 1);
  }

  return (
    <section
      ref={sectionRef}
      data-home-page
      className={cn("relative h-[520vh] snap-start bg-[#14181e] max-md:snap-start", className)}
    >
      <div
        className="sticky top-0 flex h-dvh cursor-pointer flex-col overflow-hidden"
        onPointerDown={(e) => {
          pointerStart.current = { x: e.clientX, y: e.clientY };
        }}
        onClick={(e) => {
          const start = pointerStart.current;
          pointerStart.current = null;
          if (
            start &&
            (Math.abs(e.clientX - start.x) > 12 || Math.abs(e.clientY - start.y) > 12)
          ) {
            return;
          }
          onStageActivate();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onStageActivate();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={t("nextPreviewAria")}
      >
        <MotherboardEdgeBackdrop />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(226,232,240,0.04),transparent_32%,rgba(0,0,0,0.18)),repeating-linear-gradient(90deg,rgba(255,255,255,0.03)_0px,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_5px)]" />
        <HeroGrain />

        <style>{`
          @keyframes af-ck-fade-in {
            0% { opacity: 0; transform: translateY(8px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          @keyframes af-ck-tap {
            0%, 100% { transform: translate(-40%, -40%) scale(1); opacity: 0.9; }
            45% { transform: translate(-40%, -40%) scale(0.86); opacity: 1; }
          }
          @keyframes af-ck-press {
            0%, 100% { transform: scale(1); }
            45% { transform: scale(0.9); }
          }
          @keyframes af-ck-scan {
            0%, 100% { transform: translateY(-22px); opacity: 0.35; }
            50% { transform: translateY(22px); opacity: 1; }
          }
          @keyframes af-ck-type {
            0% { width: 0; }
            100% { width: 100%; }
          }
          @keyframes af-ck-pulse {
            0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.35); }
            50% { transform: scale(1.02); box-shadow: 0 0 0 8px rgba(37, 99, 235, 0); }
          }
          @keyframes af-ck-glow {
            0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.25); }
            50% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
          }
        `}</style>

        <div className="relative z-20 flex shrink-0 flex-col items-center px-4 pt-8 text-center max-[479px]:pt-5 sm:pt-10">
          <h1 className="text-[clamp(1.55rem,4.5vw,2.5rem)] leading-[0.95] font-semibold tracking-[-0.04em] text-[#f4f4f5] max-[479px]:text-[1.35rem]">
            AcrossFlare
          </h1>
          <p className="mt-1.5 text-[clamp(0.68rem,1.6vw,0.9rem)] whitespace-nowrap text-[#888888] max-[479px]:hidden">
            {tHero("brandTagline")}
          </p>
          <p className="mt-2 text-[clamp(0.75rem,1.5vw,0.95rem)] font-medium text-emerald-300/90 max-[479px]:mt-1 max-[479px]:text-[0.75rem]">
            {t(HEADLINE_KEYS[stepId])}
          </p>
        </div>

        <div className="relative z-[5] mx-auto mt-3 min-h-0 w-full max-w-2xl flex-1 px-3 max-[479px]:mt-2 max-[479px]:max-w-none">
          <div
            key={`${stepId}-${armed ? "on" : "off"}`}
            className="h-full w-full"
            style={animate ? { animation: "af-ck-fade-in 0.45s ease-out both" } : undefined}
          >
            <StoryDeviceFrame>
              {stepId === "console-click" && (
                <ConsoleClickContent t={t} tHero={tHero} animate={animate} />
              )}
              {stepId === "qr-scan" && <QrScanFoldContent t={t} tHero={tHero} />}
              {stepId === "karing-tap" && (
                <KaringFoldContent t={t} active={false} pressed={animate} />
              )}
              {stepId === "karing-on" && <KaringFoldContent t={t} active pressed={false} />}
              {stepId === "vault-login" && <VaultLoginContent t={t} animate={animate} />}
              {stepId === "vault-backup" && <VaultBackupContent t={t} animate={animate} />}
            </StoryDeviceFrame>
          </div>
        </div>

        <div className="relative z-20 flex shrink-0 flex-col items-center px-4 pt-3 pb-5 max-[479px]:pt-2 max-[479px]:pb-4">
          <p className="max-w-xl text-center text-[clamp(0.78rem,1.5vw,0.95rem)] leading-snug text-[#c8c8c8] max-[479px]:text-[0.78rem]">
            {t(CAPTION_KEYS[stepId])}
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
        </div>
      </div>
    </section>
  );
}

/** Home main (motherboard) with tap cue on top-left Console */
function ConsoleClickContent({
  t,
  tHero,
  animate,
}: {
  t: StoryT;
  tHero: HeroT;
  animate: boolean;
}) {
  return (
    <div className="relative h-full overflow-hidden bg-[#0e1014]">
      {/* Soft homepage atmosphere */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-90"
        style={{ backgroundImage: "url(/marketing/circuit-preview.jpg?v=22)" }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(14,16,20,0.55),rgba(14,16,20,0.2)_40%,rgba(14,16,20,0.72))]" />
      <div className="pointer-events-none absolute -top-[10%] -right-[12%] h-[48%] w-[55%] rounded-full bg-emerald-400/15 blur-2xl" />

      {/* Mini marketing header — console only, top-right */}
      <div className="relative z-10 flex items-center justify-end px-2.5 pt-1.5 pb-1">
        <span
          className={cn(
            "relative rounded-[8px] bg-emerald-500 px-2 py-1 text-[9px] font-semibold text-black shadow-[0_0_0_1px_rgba(52,211,153,0.35)]",
            animate && "animate-[af-ck-glow_1.5s_ease-in-out_infinite]"
          )}
        >
          {tHero("consoleTitle")}
          {animate ? (
            <span
              className="pointer-events-none absolute top-1/2 left-1/2 z-20 size-6 rounded-full border-2 border-white/85 bg-emerald-300/40"
              style={{ animation: "af-ck-tap 1.35s ease-in-out infinite" }}
              aria-hidden="true"
            />
          ) : null}
        </span>
      </div>

      {/* Hero brand — same signal as live page 1 */}
      <div className="relative z-10 flex h-[calc(100%-2.25rem)] flex-col items-center justify-center px-4 text-center">
        <h2 className="text-[clamp(1.35rem,5.5vw,1.85rem)] leading-[0.95] font-semibold tracking-[-0.04em] text-[#f4f4f5]">
          AcrossFlare
        </h2>
        <p className="mt-1.5 text-[9px] whitespace-nowrap text-[#888888]">{tHero("brandTagline")}</p>
        <p className="mt-3 max-w-[16rem] text-[10px] leading-snug text-emerald-300/90">
          {tHero("headline")}
        </p>
      </div>
    </div>
  );
}

function QrScanFoldContent({ t, tHero }: { t: StoryT; tHero: HeroT }) {
  return (
    <StoryDevicePanes className="h-full md:h-full">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col rounded-xl border border-white/10 bg-[#090b0f] p-2.5">
        <div className="mb-1.5 flex items-center justify-between gap-1">
          <div className="flex items-center gap-1">
            <span className="flex size-4 items-center justify-center rounded bg-emerald-500 text-[8px] font-bold text-black">
              A
            </span>
            <span className="text-[10px] font-semibold text-[#f4f4f5]">Standard</span>
          </div>
          <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[8px] font-semibold text-emerald-300">
            {tHero("active")}
          </span>
        </div>
        <div className="mb-1.5 grid grid-cols-2 gap-1">
          <div className="rounded-md border border-white/8 bg-[#12151c] px-1.5 py-1">
            <p className="text-[7px] text-[#8b8b93]">{t("expires")}</p>
            <p className="truncate text-[8px] font-medium text-[#e4e4e7]">{t("expiresValue")}</p>
          </div>
          <div className="rounded-md border border-white/8 bg-[#12151c] px-1.5 py-1">
            <p className="text-[7px] text-[#8b8b93]">{tHero("nodes")}</p>
            <p className="truncate text-[8px] font-medium text-[#e4e4e7]">node-OO</p>
          </div>
        </div>
        <p className="mb-1 text-[9px] font-semibold text-[#f4f4f5]">Karing QR</p>
        <div className="mx-auto w-[72%] min-h-0 flex-1">
          <FakeQr />
        </div>
        <p className="mt-1 truncate text-[7px] text-[#6b6b73]">…/subscription/OOOO?flag=clash</p>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col rounded-xl border border-white/10 bg-[#12161c] p-2.5">
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-[11px] font-medium text-[#f4f4f5]">{t("camera")}</p>
          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-semibold text-emerald-300">
            {t("scan")}
          </span>
        </div>
        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg bg-[#1c1c1e]">
          <div className="w-[58%]">
            <FakeQr />
          </div>
          <div className="pointer-events-none absolute inset-[14%] rounded-md border-2 border-emerald-400/85" />
          <div
            className="pointer-events-none absolute inset-x-[14%] h-0.5 bg-emerald-400/90 shadow-[0_0_12px_rgba(52,211,153,0.8)]"
            style={{ top: "40%", animation: "af-ck-scan 1.8s ease-in-out infinite" }}
          />
        </div>
        <p className="mt-1.5 text-center text-[8px] text-[#8b8b93]">{t("scanHint")}</p>
      </div>
    </StoryDevicePanes>
  );
}

function KaringFoldContent({
  t,
  active,
  pressed,
}: {
  t: StoryT;
  active: boolean;
  pressed: boolean;
}) {
  return (
    <div className="flex h-full flex-col bg-[#e9e9ee] text-[#1c1c1e]">
      <div className="flex items-center gap-2 px-3 pt-1 pb-1">
        <span className="relative text-[#3a3a3c]">
          <GearIcon />
          {!active ? <span className="absolute -top-0.5 -left-0.5 size-1.5 rounded-full bg-red-500" /> : null}
        </span>
        <PencilIcon />
        <span className="ml-auto text-[10px] font-medium text-[#6b6b70]">Karing</span>
      </div>

      <div className="grid grid-cols-4 gap-1.5 px-2.5">
        {(
          [
            [<ClockIcon key="c" />, active ? "0:00:17" : "0:00:00"],
            [<MonitorIcon key="m" />, active ? "10" : "—"],
            [<TrafficIcon key="t" />, active ? "↑OO\n↓OO" : "↑0\n↓0"],
            [<SpeedIcon key="s" />, "0 B/s"],
          ] as const
        ).map(([icon, v], i) => (
          <div key={i} className="rounded-lg bg-white px-1.5 py-1 shadow-sm">
            <div className="flex items-start gap-1">
              <span className="mt-0.5 shrink-0 text-[#8b8b93]">{icon}</span>
              <p className="text-[8px] leading-tight font-semibold whitespace-pre-line">{v}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mx-2.5 mt-1.5 flex items-center justify-between rounded-xl bg-white px-2.5 py-1.5 shadow-sm">
        <div>
          <p className="text-[8px] font-semibold text-[#3a3a3c]">{t("currentProfile")}</p>
          <p className="text-[10px] font-medium">AcrossFlare</p>
          <p className="text-[7px] text-[#8b8b93]">↑ 0 B ↓ OO GB · OO/OO/OOOO</p>
        </div>
        <div className="flex overflow-hidden rounded-md text-[8px] font-medium">
          <span className="bg-[#d6d6dc] px-2 py-1">{t("rule")}</span>
          <span className="bg-white px-2 py-1 text-[#8b8b93]">{t("global")}</span>
        </div>
      </div>

      <div className="mx-2.5 mt-1.5 grid flex-1 grid-cols-4 gap-1.5 text-[8px]">
        <div className="flex flex-col justify-between rounded-xl bg-white px-2 py-1.5 shadow-sm">
          <span>{t("systemProxy")}</span>
          <span className="mt-1 h-3 w-5 self-end rounded-full bg-[#d1d1d6]">
            <span className="mt-0.5 ml-0.5 block size-2 rounded-full bg-white shadow" />
          </span>
        </div>
        {[t("myProfiles"), t("dns"), t("addProfile")].map((label) => (
          <div key={label} className="rounded-xl bg-white px-2 py-1.5 shadow-sm">
            {label}
          </div>
        ))}
      </div>

      <div className="relative mt-1 flex flex-col items-center">
        <div className="relative z-10 mb-[-14px]">
          <div
            className="flex size-[58px] items-center justify-center rounded-full border-[4px] bg-[#e9e9ee] shadow-[0_6px_16px_rgba(0,0,0,0.12)]"
            style={{
              borderColor: active ? "#28c840" : "#e11d48",
              transition: "border-color 220ms ease",
              animation: pressed && !active ? "af-ck-press 1.2s ease-in-out infinite" : undefined,
            }}
          >
            {active ? <ShieldCheck /> : <ShieldX />}
          </div>
        </div>
        <div className="flex w-full items-end justify-between bg-white px-3 pt-4 pb-2 text-[9px] shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
          <span className="w-10" />
          <span className="font-medium text-[#3a3a3c]">node-OO</span>
          <span className={cn("font-semibold", active ? "text-emerald-600" : "text-[#8b8b93]")}>
            {active ? "43 ms ›" : "— ›"}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Vaultwarden login — email then password auto-fill (OO masked) */
function VaultLoginContent({ t, animate }: { t: StoryT; animate: boolean }) {
  return (
    <div className="flex h-full flex-col bg-[#f0f0f0] text-[#1c1c1e]">
      <div className="flex items-center gap-1.5 px-3 pt-2">
        <VaultGear className="size-4" />
        <span className="text-[10px] font-medium tracking-tight text-[#3a3a3c]">vaultwarden</span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-4 pb-4">
        <VaultGear className="size-10" />
        <p className="mt-2 text-[15px] font-semibold">{t("login")}</p>

        <div className="mt-3 w-full max-w-[260px] rounded-lg border border-[#d8d8d8] bg-white px-3 py-3 shadow-sm">
          <label className="block text-[9px] font-medium text-[#5a5a5a]">
            {t("emailLabel")} <span className="text-[#175ddc]">{t("required")}</span>
          </label>
          <div className="mt-1 overflow-hidden rounded-md border-2 border-[#175ddc] bg-white px-2 py-1.5 font-mono text-[11px] text-[#1c1c1e]">
            <span
              className="inline-block overflow-hidden whitespace-nowrap align-bottom"
              style={
                animate
                  ? { animation: "af-ck-type 1.1s steps(18, end) 0.2s both", maxWidth: "100%" }
                  : undefined
              }
            >
              oo@acrossflare.com
            </span>
          </div>

          <label className="mt-2.5 block text-[9px] font-medium text-[#5a5a5a]">
            {t("passwordLabel")} <span className="text-[#175ddc]">{t("required")}</span>
          </label>
          <div className="mt-1 overflow-hidden rounded-md border border-[#c8c8c8] bg-white px-2 py-1.5 font-mono text-[11px] tracking-[0.18em] text-[#1c1c1e]">
            <span
              className="inline-block overflow-hidden whitespace-nowrap align-bottom"
              style={
                animate
                  ? { animation: "af-ck-type 0.9s steps(10, end) 1.4s both", maxWidth: "100%" }
                  : undefined
              }
            >
              ••••••••
            </span>
          </div>

          <label className="mt-2.5 flex items-center gap-1.5 text-[9px] text-[#3a3a3c]">
            <span className="flex size-3 items-center justify-center rounded-[2px] border border-[#8b8b93] bg-white">
              <span className="size-1.5 rounded-[1px] bg-[#175ddc]" />
            </span>
            {t("rememberEmail")}
          </label>

          <div
            className="mt-3 rounded-full bg-[#175ddc] py-2 text-center text-[11px] font-semibold text-white"
            style={animate ? { animation: "af-ck-pulse 1.4s ease-in-out 2.4s infinite" } : undefined}
          >
            {t("login")}
          </div>
        </div>
      </div>

      <p className="pb-2 text-center text-[7px] text-[#8b8b93]">Vaultwarden Web · Version 2025.1.1</p>
    </div>
  );
}

/** Vaultwarden vault — highlight import / backup capability */
function VaultBackupContent({ t, animate }: { t: StoryT; animate: boolean }) {
  const nav = [
    [t("navVault"), true],
    [t("navSend"), false],
    [t("navTools"), false],
    [t("navReports"), false],
    [t("navSettings"), false],
  ] as const;

  return (
    <div className="flex h-full bg-white text-[#1c1c1e]">
      {/* Compact sidebar */}
      <div className="flex w-[72px] shrink-0 flex-col bg-[#1a1d21] px-1.5 py-2 text-[7px] text-[#c8c8c8] md:w-[96px]">
        <div className="mb-2 flex items-center gap-1 px-0.5">
          <VaultGear className="size-3.5 shrink-0 invert" />
          <span className="truncate font-medium leading-tight text-white md:text-[8px]">Vaultwarden</span>
        </div>
        {nav.map(([label, on]) => (
          <div
            key={label}
            className={cn(
              "mb-0.5 rounded-md px-1.5 py-1",
              on ? "bg-white/12 font-semibold text-white" : "text-[#9a9a9a]"
            )}
          >
            {label}
          </div>
        ))}
        <div className="mt-auto px-1 pt-2 text-[6px] text-[#7a7a7a]">{t("passwordManager")}</div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#e5e5e5] px-2.5 py-1.5">
          <p className="text-[12px] font-semibold">{t("allVaults")}</p>
          <div className="flex items-center gap-1.5">
            <span className="rounded-md bg-[#175ddc] px-2 py-1 text-[8px] font-semibold text-white">
              {t("newItem")}
            </span>
            <span className="flex size-5 items-center justify-center rounded-full bg-[#c4a574] text-[7px] font-bold text-white">
              OO
            </span>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-hidden p-2">
          <div
            className={cn(
              "rounded-lg border border-[#d8d8d8] bg-[#f7f7f7] p-2",
              animate && "ring-2 ring-emerald-400/70"
            )}
            style={animate ? { animation: "af-ck-glow 1.8s ease-in-out infinite" } : undefined}
          >
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[9px] font-semibold">{t("getStarted")}</p>
              <p className="text-[8px] font-medium text-[#175ddc]">{t("complete")}</p>
            </div>
            <div className="mb-2 h-1 overflow-hidden rounded-full bg-[#d8d8d8]">
              <div className="h-full w-2/3 rounded-full bg-[#175ddc]" />
            </div>
            <ul className="space-y-1 text-[8px]">
              <li className="flex items-start gap-1.5 text-[#3a3a3c]">
                <span className="mt-px text-emerald-600">✓</span>
                <span>{t("createAccount")}</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="mt-px text-emerald-600">✓</span>
                <div>
                  <p className="font-semibold text-emerald-700">{t("importData")}</p>
                  <p className="text-[7px] leading-snug text-[#6b6b73]">{t("importHint")}</p>
                </div>
              </li>
              <li className="flex items-start gap-1.5 text-[#8b8b93]">
                <span className="mt-px">○</span>
                <span>{t("installExtension")}</span>
              </li>
            </ul>
          </div>

          <div className="rounded-lg border border-[#e5e5e5]">
            <div className="flex items-center justify-between border-b border-[#e5e5e5] px-2 py-1 text-[8px] text-[#6b6b73]">
              <span>{t("name")}</span>
              <span>{t("owner")}</span>
            </div>
            <div className="flex items-center gap-2 px-2 py-1.5">
              <span className="flex size-5 items-center justify-center rounded bg-[#ececec]">
                <svg viewBox="0 0 16 16" className="size-3 text-[#6b6b73]" fill="currentColor" aria-hidden="true">
                  <path d="M3 1.5h6l4 4V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2.5a1 1 0 0 1 1-1Zm6 0v4h4" />
                </svg>
              </span>
              <span className="min-w-0 flex-1 truncate text-[10px] font-medium">{t("user")}</span>
              <span className="rounded-full bg-[#c4a574]/25 px-1.5 py-0.5 text-[7px] font-semibold text-[#8a6a3a]">
                {t("me")}
              </span>
            </div>
          </div>

          <div
            className={cn(
              "rounded-lg border border-emerald-400/50 bg-emerald-50 px-2.5 py-2 text-center",
              animate && "animate-[af-ck-glow_1.6s_ease-in-out_infinite]"
            )}
          >
            <p className="text-[10px] font-semibold text-emerald-800">{t("backupReady")}</p>
            <p className="mt-0.5 text-[8px] text-emerald-700/90">{t("backupReadyHint")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function VaultGear({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <path
        d="M16 8.5c-2.2 0-3.6 1.5-3.6 3.4 0 1.3.6 2.3 1.7 3l-2.4 5.2h2.2l1.5-3.4h1.2l1.5 3.4h2.2l-2.4-5.2c1.1-.7 1.7-1.7 1.7-3 0-1.9-1.4-3.4-3.6-3.4Zm0 2c1 0 1.6.7 1.6 1.5S17 13.5 16 13.5 14.4 12.8 14.4 12 15 10.5 16 10.5Z"
        fill="currentColor"
      />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <rect
          key={deg}
          x="14.5"
          y="2"
          width="3"
          height="4"
          rx="0.6"
          fill="currentColor"
          transform={`rotate(${deg} 16 16)`}
        />
      ))}
    </svg>
  );
}

function ShieldX() {
  return (
    <svg viewBox="0 0 48 48" className="size-7" fill="none">
      <path
        d="M24 8c-7 0-14 3.5-14 10v6c0 8 6 14 14 16 8-2 14-8 14-16v-6c0-6.5-7-10-14-10Z"
        fill="#e11d48"
      />
      <path d="M19 19l10 10M29 19L19 29" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function ShieldCheck() {
  return (
    <svg viewBox="0 0 48 48" className="size-7" fill="none">
      <path
        d="M24 8c-7 0-14 3.5-14 10v6c0 8 6 14 14 16 8-2 14-8 14-16v-6c0-6.5-7-10-14-10Z"
        fill="#28c840"
      />
      <path d="M18 24l4 4 8-9" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3a3a3c" strokeWidth="1.8">
      <path d="M4 20l4.5-1.2L19 8.3a2 2 0 0 0 0-2.8L18.5 5a2 2 0 0 0-2.8 0L5.2 15.5 4 20z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function MonitorIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="12" rx="1.5" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  );
}

function TrafficIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 12a8 8 0 0 1 16 0" />
      <path d="M12 4v8M8 16l4-4 4 4" />
    </svg>
  );
}

function SpeedIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 19a7 7 0 1 0-7-7" />
      <path d="M12 12l4-3" />
    </svg>
  );
}

function FakeQr() {
  const cells = [
    "1111111000101111111",
    "1000001011101000001",
    "1011101001001011101",
    "1011101010101011101",
    "1011101000011011101",
    "1000001010111000001",
    "1111111010101111111",
    "0000000010010000000",
    "1100101110101110101",
    "0011010001110001011",
    "1100101110001010111",
    "0000000010110010100",
    "1111111010011101001",
    "1000001011100010110",
    "1011101000101111010",
    "1011101011010001101",
    "1011101000110110010",
    "1000001011101010111",
    "1111111001011101001",
  ];
  return (
    <div className="aspect-square w-full rounded-md bg-white p-1">
      <div
        className="grid size-full gap-px"
        style={{ gridTemplateColumns: `repeat(${cells[0]!.length}, minmax(0, 1fr))` }}
      >
        {cells.flatMap((row, y) =>
          row.split("").map((bit, x) => (
            <span key={`${y}-${x}`} className={bit === "1" ? "bg-black" : "bg-white"} />
          ))
        )}
      </div>
    </div>
  );
}
