"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { HeroGrain } from "@/components/marketing/hero-grain";

type PugMood = "neutral" | "confused" | "worry" | "happy" | "proud";

const PANEL1_MS = 8000;
const PANEL_MS = 6200;

export function WhyBuyComicPreview({ className }: { className?: string }) {
  const [runId, setRunId] = useState(0);
  const [activePanel, setActivePanel] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    setActivePanel(0);
    setClosing(false);
    if (reduced) {
      setActivePanel(3);
      setClosing(true);
      return;
    }
    const timers = [
      window.setTimeout(() => setActivePanel(1), PANEL1_MS),
      window.setTimeout(() => setActivePanel(2), PANEL1_MS + PANEL_MS),
      window.setTimeout(() => setActivePanel(3), PANEL1_MS + PANEL_MS * 2),
      window.setTimeout(() => setClosing(true), PANEL1_MS + PANEL_MS * 3 + 500),
    ];
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [reduced, runId]);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          메인 2페이지 프리뷰 · 퍼그 4컷 · 컷마다 짧은 동영상 연출
        </p>
        <button
          type="button"
          onClick={() => setRunId((n) => n + 1)}
          className="rounded-md border border-white/15 px-2.5 py-1 text-xs text-foreground/80 transition hover:bg-white/5"
        >
          다시 재생
        </button>
      </div>

      <div className="relative h-[min(86dvh,720px)] w-full overflow-hidden bg-[#14181e]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(226,232,240,0.07),transparent_34%,rgba(0,0,0,0.2)),repeating-linear-gradient(90deg,rgba(255,255,255,0.045)_0px,rgba(255,255,255,0.045)_1px,transparent_1px,transparent_5px)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.1),transparent_55%)]" />
        <HeroGrain />

        <style>{`
          @keyframes af-plane-in {
            0% { transform: translate(120px,-36px) scale(0.72); opacity: 0; }
            18% { opacity: 1; }
            100% { transform: translate(0,0) scale(1); opacity: 1; }
          }
          @keyframes af-runway-blink {
            0%, 100% { opacity: 0.25; }
            50% { opacity: 1; }
          }
          @keyframes af-cloud-drift {
            0% { transform: translateX(0); }
            100% { transform: translateX(-28px); }
          }
          @keyframes af-phone-rise {
            0% { transform: translateY(18px) scale(0.92); opacity: 0; }
            100% { transform: translateY(0) scale(1); opacity: 1; }
          }
          @keyframes af-screen-on {
            0% { opacity: 0.15; }
            100% { opacity: 1; }
          }
          @keyframes af-fail-pop {
            0% { transform: scale(0.4); opacity: 0; }
            60% { transform: scale(1.12); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes af-bubble-in {
            0% { transform: translate(-12px, -10px) scale(0.92); opacity: 0; }
            70% { transform: translate(0, 0) scale(1.02); opacity: 1; }
            100% { transform: translate(0, 0) scale(1); opacity: 1; }
          }
          @keyframes af-pug-breathe {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-2px); }
          }
          @keyframes af-wifi-pulse {
            0%, 100% { opacity: 0.35; }
            50% { opacity: 1; }
          }
          @keyframes af-lock-shake {
            0%, 100% { transform: rotate(0deg); }
            25% { transform: rotate(-8deg); }
            75% { transform: rotate(8deg); }
          }
          @keyframes af-spark-ring {
            0% { transform: scale(0.6); opacity: 0; }
            40% { opacity: 0.8; }
            100% { transform: scale(1.35); opacity: 0; }
          }
          @keyframes af-check-pop {
            0% { transform: scale(0); opacity: 0; }
            70% { transform: scale(1.1); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes af-upload-bar {
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
        </div>

        <div className="absolute inset-x-0 top-[7.1rem] bottom-4 z-10 flex flex-col px-3 sm:top-[7.8rem] sm:px-5">
          <div className="mx-auto grid h-full w-full max-w-5xl grid-cols-1 gap-2.5 sm:grid-cols-2 sm:grid-rows-2 sm:gap-3">
            <ComicPanel no="01" active={activePanel >= 0}>
              <PanelArrive
                playing={activePanel === 0 || reduced}
                done={activePanel > 0 || reduced}
                reduced={reduced}
                runId={runId}
              />
            </ComicPanel>
            <ComicPanel no="02" active={activePanel >= 1}>
              <PanelWifi
                playing={activePanel === 1 || reduced}
                done={activePanel > 1 || reduced}
                reduced={reduced}
              />
            </ComicPanel>
            <ComicPanel no="03" active={activePanel >= 2}>
              <PanelConnect
                playing={activePanel === 2 || reduced}
                done={activePanel > 2 || reduced}
                reduced={reduced}
              />
            </ComicPanel>
            <ComicPanel no="04" active={activePanel >= 3}>
              <PanelBackup
                playing={activePanel === 3 || reduced}
                done={closing || reduced}
                reduced={reduced}
              />
            </ComicPanel>
          </div>

          <p
            className={cn(
              "mt-2.5 text-center text-[clamp(0.8rem,1.7vw,1rem)] font-medium text-emerald-300 transition-all duration-500",
              closing ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
            )}
          >
            AcrossFlare로, 지금 환경 그대로 시작하세요.
          </p>
        </div>
      </div>
    </div>
  );
}

function ComicPanel({ no, active, children }: { no: string; active: boolean; children: ReactNode }) {
  return (
    <article
      className={cn(
        "relative min-h-[160px] overflow-hidden rounded-xl border border-white/12 bg-[#0f141a]/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-500 ease-out sm:min-h-0",
        active ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      )}
    >
      <div className="absolute top-2.5 right-2.5 z-20 rounded bg-black/35 px-1.5 py-0.5 font-mono text-[10px] tracking-[0.14em] text-emerald-300/80">
        {no}
      </div>
      {children}
    </article>
  );
}

/**
 * Pop-art comic balloon — oversized, thick black outline, cropped top-left.
 * Tail points down toward the pug (like the reference capture).
 */
function SpeechBubble({
  children,
  show,
  animate,
  tone = "plain",
}: {
  children: ReactNode;
  show: boolean;
  animate?: boolean;
  tone?: "plain" | "ok";
}) {
  if (!show) return null;

  const fill = tone === "ok" ? "#ecfdf5" : "#ffffff";
  const stroke = "#0a0a0a";
  const text = tone === "ok" ? "text-emerald-950" : "text-neutral-950";

  return (
    <div
      className="pointer-events-none absolute -top-10 -left-14 z-30 w-[92%] max-w-[320px]"
      style={animate ? { animation: "af-bubble-in 0.55s cubic-bezier(0.22,1,0.36,1) both" } : undefined}
    >
      <div className="relative min-h-[132px]">
        <svg
          viewBox="0 0 300 160"
          className="absolute inset-0 size-full"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {/* thick outer outline */}
          <path
            d="M20 18
               H250
               C278 18 292 34 292 58
               V98
               C292 122 278 136 250 136
               H128
               L78 156
               L98 136
               H20
               C-2 136 -14 122 -14 98
               V58
               C-14 34 0 18 20 18 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="7"
            strokeLinejoin="round"
          />
        </svg>
        <div
          className={cn(
            "relative px-6 pt-8 pb-9 pl-8 text-[clamp(0.78rem,1.5vw,0.95rem)] leading-[1.25] font-black tracking-[-0.02em]",
            text
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}


function PanelArrive({
  playing,
  done,
  reduced,
  runId,
}: {
  playing: boolean;
  done: boolean;
  reduced: boolean;
  runId: number;
}) {
  const [beat, setBeat] = useState<"plane" | "phone" | "bubble">("plane");

  useEffect(() => {
    if (reduced || done) {
      setBeat("bubble");
      return;
    }
    if (!playing) {
      return;
    }
    setBeat("plane");
    const t1 = window.setTimeout(() => setBeat("phone"), 3500);
    const t2 = window.setTimeout(() => setBeat("bubble"), 7000);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [playing, done, reduced, runId]);

  const showPhone = beat === "phone" || beat === "bubble";
  const showBubble = beat === "bubble";

  return (
    <div className="absolute inset-0">
      {/* Plane — only while that beat is active (not frozen on done) */}
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-700",
          beat === "plane" && !done ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      >
        <svg viewBox="0 0 420 240" className="absolute inset-0 size-full" aria-hidden="true">
          <defs>
            <linearGradient id="arrive-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1c2736" />
              <stop offset="55%" stopColor="#121821" />
              <stop offset="100%" stopColor="#0b0f14" />
            </linearGradient>
            <linearGradient id="arrive-runway" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#1a1f27" />
              <stop offset="50%" stopColor="#2a313c" />
              <stop offset="100%" stopColor="#1a1f27" />
            </linearGradient>
          </defs>
          <rect width="420" height="240" fill="url(#arrive-sky)" />
          <g style={{ animation: playing && beat === "plane" ? "af-cloud-drift 10s linear infinite" : undefined }}>
            <ellipse cx="70" cy="48" rx="42" ry="10" fill="#2a3545" opacity="0.55" />
            <ellipse cx="210" cy="36" rx="36" ry="8" fill="#2a3545" opacity="0.4" />
            <ellipse cx="340" cy="54" rx="48" ry="11" fill="#2a3545" opacity="0.5" />
          </g>
          <rect x="18" y="98" width="54" height="52" fill="#18202b" />
          <rect x="28" y="108" width="10" height="10" fill="#3b82f6" opacity="0.55" />
          <rect x="44" y="108" width="10" height="10" fill="#3b82f6" opacity="0.35" />
          <rect x="84" y="110" width="34" height="40" fill="#151c26" />
          <path d="M300 150 L340 92 L390 150 Z" fill="#1a222d" />
          <path d="M0 168 L120 150 H300 L420 168 V240 H0 Z" fill="url(#arrive-runway)" />
          {Array.from({ length: 9 }, (_, i) => (
            <rect
              key={i}
              x={128 + i * 18}
              y="158"
              width="10"
              height="3"
              rx="1"
              fill="#f8fafc"
              style={{
                animation:
                  playing && beat === "plane" ? `af-runway-blink 1.1s ease-in-out ${i * 0.08}s infinite` : undefined,
              }}
            />
          ))}
          <g
            style={{
              animation: playing && beat === "plane" ? "af-plane-in 2.6s cubic-bezier(0.22,1,0.36,1) forwards" : undefined,
              transformOrigin: "260px 130px",
            }}
          >
            <ellipse cx="268" cy="138" rx="54" ry="7" fill="#000" opacity="0.28" />
            <path d="M190 128 C210 118, 250 114, 300 120 L318 124 C304 132, 250 138, 208 136 Z" fill="#e2e8f0" />
            <path d="M248 120 L278 102 L286 106 L262 126 Z" fill="#cbd5e1" />
            <path d="M248 134 L276 150 L284 146 L262 130 Z" fill="#94a3b8" />
            <path d="M198 126 L188 112 L196 112 L208 124 Z" fill="#94a3b8" />
            <circle cx="232" cy="128" r="3.2" fill="#38bdf8" />
            <circle cx="246" cy="126" r="3.2" fill="#38bdf8" />
            <circle cx="260" cy="125" r="3.2" fill="#38bdf8" />
            <rect x="292" y="118" width="18" height="5" rx="1" fill="#ef4444" />
          </g>
          <text x="24" y="226" fill="#64748b" fontSize="11" letterSpacing="1">
            ARRIVAL · GATE B12
          </text>
        </svg>
      </div>

      {/* Phone + right-facing pug — final resting frame */}
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-700",
          showPhone || done ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      >
        <svg viewBox="0 0 420 240" className="absolute inset-0 size-full" aria-hidden="true">
          <defs>
            <linearGradient id="arrive-lounge" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#18212c" />
              <stop offset="100%" stopColor="#0c1016" />
            </linearGradient>
          </defs>
          <rect width="420" height="240" fill="url(#arrive-lounge)" />
          <rect x="0" y="176" width="420" height="64" fill="#121820" />
          <text x="168" y="40" fill="#475569" fontSize="10">
            中国 · Arrival Hall
          </text>

          {/* Phone — right / mid-lower */}
          <g
            style={{
              animation: showPhone && !done ? "af-phone-rise 0.7s ease-out forwards" : undefined,
            }}
          >
            <rect x="262" y="58" width="122" height="156" rx="18" fill="#0a0c10" stroke="#475569" strokeWidth="3" />
            <rect
              x="270"
              y="70"
              width="106"
              height="132"
              rx="10"
              fill="#111827"
              style={{ animation: showPhone && !done ? "af-screen-on 0.9s ease-out forwards" : undefined }}
            />
            <circle cx="323" cy="64" r="3" fill="#1f2937" />
            <PhoneApp x={280} y={84} label="카톡" fail={showBubble || done} delay={0} />
            <PhoneApp x={328} y={84} label="LINE" fail={showBubble || done} delay={0.12} />
            <PhoneApp x={280} y={128} label="Tube" fail={showBubble || done} delay={0.24} />
            <PhoneApp x={328} y={128} label="NFLX" fail={showBubble || done} delay={0.36} />
          </g>

          {/* Pug bottom-left-ish but facing right, under bubble crop zone */}
          <g style={{ animation: playing || done ? "af-pug-breathe 3.2s ease-in-out infinite" : undefined }}>
            <PugComic x={8} y={118} scale={1.15} mood={showBubble || done ? "confused" : "neutral"} />
          </g>
        </svg>

        <SpeechBubble show={showBubble || done} animate={showBubble && !done}>
          중국에 도착했는데…
          <br />
          카톡, 라인, 유튜브, 넷플릭스가 안되네…
        </SpeechBubble>
      </div>
    </div>
  );
}

function PanelWifi({
  playing,
  done,
  reduced,
}: {
  playing: boolean;
  done: boolean;
  reduced: boolean;
}) {
  const showBubble = playing || done || reduced;

  return (
    <div className="absolute inset-0">
      <svg viewBox="0 0 420 240" className="absolute inset-0 size-full" aria-hidden="true">
        <rect width="420" height="240" fill="#10151b" />
        <rect x="0" y="176" width="420" height="64" fill="#121820" />
        <text x="150" y="36" fill="#64748b" fontSize="11">
          Hotel Room · Free Wi-Fi
        </text>
        <rect x="150" y="52" width="240" height="112" rx="14" fill="#171d25" stroke="#334155" strokeWidth="2" />
        <text x="270" y="80" textAnchor="middle" fill="#64748b" fontSize="12">
          Connect to network
        </text>
        <g transform="translate(232 90)">
          <path
            d="M10 34 C26 10, 50 10, 66 34"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="4"
            strokeLinecap="round"
            style={{ animation: playing || reduced ? "af-wifi-pulse 1.6s ease-in-out infinite" : undefined }}
          />
          <path
            d="M22 40 C32 26, 44 26, 54 40"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="4"
            strokeLinecap="round"
            style={{ animation: playing || reduced ? "af-wifi-pulse 1.6s ease-in-out 0.15s infinite" : undefined }}
          />
          <circle cx="38" cy="50" r="5" fill="#f59e0b" />
        </g>
        <g
          style={{
            transformOrigin: "350px 78px",
            animation: playing || reduced ? "af-lock-shake 0.85s ease-in-out infinite" : undefined,
          }}
        >
          <rect x="338" y="74" width="24" height="20" rx="4" fill="#7f1d1d" stroke="#ef4444" strokeWidth="1.5" />
          <path d="M342 74 V68 C342 62, 358 62, 358 68 V74" fill="none" stroke="#ef4444" strokeWidth="2.2" />
        </g>
        <text x="270" y="148" textAnchor="middle" fill="#fbbf24" fontSize="11">
          Connected · Unsecured
        </text>
        <g style={{ animation: playing || done ? "af-pug-breathe 3.2s ease-in-out infinite" : undefined }}>
          <PugComic x={6} y={118} scale={1.12} mood="worry" />
        </g>
      </svg>
      <SpeechBubble show={showBubble} animate={playing && !done}>
        연결은 됐는데…
        <br />
        이거 안전한 거 맞아?
      </SpeechBubble>
    </div>
  );
}

function PanelConnect({
  playing,
  done,
  reduced,
}: {
  playing: boolean;
  done: boolean;
  reduced: boolean;
}) {
  const showBubble = playing || done || reduced;

  return (
    <div className="absolute inset-0">
      <svg viewBox="0 0 420 240" className="absolute inset-0 size-full" aria-hidden="true">
        <rect width="420" height="240" fill="#0c1412" />
        <rect x="0" y="176" width="420" height="64" fill="#0a1210" />
        <circle
          cx="250"
          cy="92"
          r="54"
          fill="none"
          stroke="#10b981"
          strokeWidth="1.2"
          opacity="0.35"
          style={{ animation: playing || reduced ? "af-spark-ring 2.6s ease-out infinite" : undefined }}
        />
        <circle cx="250" cy="92" r="34" fill="none" stroke="#34d399" strokeWidth="1.4" opacity="0.5" />
        <line x1="250" y1="92" x2="180" y2="48" stroke="#34d399" strokeWidth="1.3" opacity="0.8" />
        <line x1="250" y1="92" x2="320" y2="48" stroke="#34d399" strokeWidth="1.3" opacity="0.8" />
        <line x1="250" y1="92" x2="188" y2="140" stroke="#34d399" strokeWidth="1.3" opacity="0.8" />
        <line x1="250" y1="92" x2="312" y2="140" stroke="#34d399" strokeWidth="1.3" opacity="0.8" />
        <circle cx="250" cy="92" r="9" fill="#6ee7b7" />
        <OkApp x={160} y={28} label="카톡" />
        <OkApp x={288} y={28} label="LINE" />
        <OkApp x={160} y={128} label="Tube" />
        <OkApp x={288} y={128} label="NFLX" />
        <g style={{ animation: playing || done ? "af-pug-breathe 3.2s ease-in-out infinite" : undefined }}>
          <PugComic x={6} y={118} scale={1.12} mood="happy" />
        </g>
      </svg>
      <SpeechBubble show={showBubble} animate={playing && !done} tone="ok">
        AcrossFlare 연결!
        <br />
        쓰던 앱이 그대로 살아난다
      </SpeechBubble>
    </div>
  );
}

function PanelBackup({
  playing,
  done,
  reduced,
}: {
  playing: boolean;
  done: boolean;
  reduced: boolean;
}) {
  const showBubble = playing || done || reduced;

  return (
    <div className="absolute inset-0">
      <svg viewBox="0 0 420 240" className="absolute inset-0 size-full" aria-hidden="true">
        <rect width="420" height="240" fill="#0d1218" />
        <rect x="0" y="176" width="420" height="64" fill="#0c1016" />
        <rect x="130" y="36" width="260" height="120" rx="14" fill="#121a22" stroke="#10b981" strokeWidth="1.6" />
        <text x="150" y="64" fill="#94a3b8" fontSize="12">
          Secure Cloud Backup
        </text>
        <rect x="150" y="78" width="180" height="10" rx="5" fill="#1f2a36" />
        <rect
          x="150"
          y="78"
          width="180"
          height="10"
          rx="5"
          fill="#34d399"
          style={{
            transformOrigin: "150px 83px",
            transform: done || reduced ? "scaleX(1)" : undefined,
            animation: playing && !done && !reduced ? "af-upload-bar 2.4s ease-out forwards" : undefined,
          }}
        />
        <text x="150" y="108" fill="#64748b" fontSize="11">
          자료.pdf · 비밀번호 · 메모
        </text>
        <g
          style={{
            animation:
              playing && !done
                ? "af-check-pop 0.65s ease-out 2s both"
                : done || reduced
                  ? undefined
                  : undefined,
            opacity: done || reduced ? 1 : undefined,
          }}
        >
          <circle cx="348" cy="92" r="20" fill="#064e3b" stroke="#34d399" strokeWidth="2" />
          <path
            d="M338 93 L345 100 L360 82"
            fill="none"
            stroke="#a7f3d0"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
        <g style={{ animation: playing || done ? "af-pug-breathe 3.2s ease-in-out infinite" : undefined }}>
          <PugComic x={6} y={118} scale={1.12} mood="proud" />
        </g>
      </svg>
      <SpeechBubble show={showBubble} animate={playing && !done} tone="ok">
        자료까지 안전하게 백업.
        <br />
        그래서 산다!
      </SpeechBubble>
    </div>
  );
}

function PhoneApp({
  x,
  y,
  label,
  fail,
  delay,
  dim,
}: {
  x: number;
  y: number;
  label: string;
  fail?: boolean;
  delay: number;
  dim?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y})`} opacity={dim ? 0.35 : 1}>
      <rect width="42" height="36" rx="9" fill="#1f2937" />
      <text x="21" y="22" textAnchor="middle" fill="#e2e8f0" fontSize="9">
        {label}
      </text>
      {fail ? (
        <g style={{ animation: `af-fail-pop 0.45s ease-out ${delay}s both` }}>
          <circle cx="36" cy="4" r="8" fill="#ef4444" />
          <path d="M33 1 L39 7 M39 1 L33 7" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
        </g>
      ) : null}
    </g>
  );
}

function OkApp({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width="52" height="26" rx="8" fill="#052e24" stroke="#34d399" strokeWidth="1.4" />
      <text x="26" y="17" textAnchor="middle" fill="#a7f3d0" fontSize="11">
        {label}
      </text>
      <g style={{ animation: "af-check-pop 0.45s ease-out both" }}>
        <circle cx="48" cy="2" r="7" fill="#059669" />
        <path d="M45 2 L47.5 4.5 L52 -1" fill="none" stroke="#ecfdf5" strokeWidth="1.5" strokeLinecap="round" />
      </g>
    </g>
  );
}

/** Realistic monochrome sitting pug — light crown, side ears (no “hat”) */
function PugComic({ x, y, scale = 1, mood }: { x: number; y: number; scale?: number; mood: PugMood }) {
  const sad = mood === "worry" || mood === "confused";
  const uid = useId().replace(/:/g, "");
  const headLit = `pug-head-lit-${uid}`;
  const bodyLit = `pug-body-lit-${uid}`;
  const mask = `pug-mask-${uid}`;

  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <defs>
        <radialGradient id={headLit} cx="32%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor="#e8e8e8" />
          <stop offset="100%" stopColor="#9a9a9a" />
        </radialGradient>
        <radialGradient id={bodyLit} cx="30%" cy="40%" r="75%">
          <stop offset="0%" stopColor="#f2f2f2" />
          <stop offset="55%" stopColor="#cfcfcf" />
          <stop offset="100%" stopColor="#7a7a7a" />
        </radialGradient>
        <linearGradient id={mask} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a2a2a" />
          <stop offset="100%" stopColor="#0d0d0d" />
        </linearGradient>
      </defs>

      {/* ground shadow to the right (like the photo) */}
      <ellipse cx="62" cy="112" rx="40" ry="7" fill="#000" opacity="0.35" />

      {/* sitting haunches */}
      <ellipse cx="48" cy="92" rx="28" ry="18" fill={`url(#${bodyLit})`} />
      <ellipse cx="64" cy="94" rx="14" ry="16" fill="#6e6e6e" opacity="0.55" />

      {/* chest */}
      <ellipse cx="48" cy="78" rx="24" ry="20" fill={`url(#${bodyLit})`} />

      {/* front legs — short, straight */}
      <path d="M34 82 L30 108" stroke="#d8d8d8" strokeWidth="9" strokeLinecap="round" />
      <path d="M58 82 L62 108" stroke="#b0b0b0" strokeWidth="9" strokeLinecap="round" />
      <ellipse cx="30" cy="109" rx="7" ry="3.5" fill="#1a1a1a" />
      <ellipse cx="62" cy="109" rx="7" ry="3.5" fill="#1a1a1a" />
      {/* leg shadow side */}
      <path d="M58 84 L62 106" stroke="#555" strokeWidth="2.5" strokeLinecap="round" opacity="0.45" />

      {/* neck rolls */}
      <ellipse cx="48" cy="62" rx="20" ry="10" fill="#d0d0d0" />
      <path d="M30 60 Q48 66 66 60" fill="none" stroke="#888" strokeWidth="1.4" opacity="0.7" />

      {/* head — light crown is critical (avoids hat look) */}
      <ellipse cx="48" cy="40" rx="30" ry="28" fill={`url(#${headLit})`} />
      {/* right-side head shadow */}
      <path
        d="M48 14 C66 14, 78 30, 76 48 C74 62, 60 68, 48 66 Z"
        fill="#000"
        opacity="0.22"
      />

      {/* ears — separate dark flaps on the SIDES only, not across the crown */}
      <path
        d="M20 28
           C14 22, 12 30, 16 38
           C18 44, 24 46, 28 42
           C26 34, 24 30, 20 28 Z"
        fill="#111"
      />
      <path
        d="M76 28
           C82 22, 84 30, 80 38
           C78 44, 72 46, 68 42
           C70 34, 72 30, 76 28 Z"
        fill="#111"
      />

      {/* deep forehead wrinkles on LIGHT fur */}
      <path d="M28 26 Q48 18 68 26" fill="none" stroke="#555" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M30 31 Q48 24 66 31" fill="none" stroke="#666" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M32 36 Q48 30 64 36" fill="none" stroke="#777" strokeWidth="1.25" strokeLinecap="round" />
      {sad ? (
        <path d="M34 22 Q48 16 62 22" fill="none" stroke="#444" strokeWidth="1.6" strokeLinecap="round" />
      ) : null}

      {/* black face mask — muzzle + eye area only, soft edge under brows */}
      <ellipse cx="48" cy="48" rx="22" ry="18" fill={`url(#${mask})`} />
      {/* keep a light brow stripe so mask doesn't read as a cap */}
      <ellipse cx="48" cy="34" rx="18" ry="6" fill="#e4e4e4" opacity="0.85" />
      <path d="M32 36 Q48 32 64 36" fill="none" stroke="#666" strokeWidth="1.1" />

      {/* large dark eyes with catchlight */}
      <ellipse cx="36" cy="46" rx="7.5" ry="8.2" fill="#0a0a0a" />
      <ellipse cx="60" cy="46" rx="7.5" ry="8.2" fill="#0a0a0a" />
      <circle cx="38.5" cy="43.5" r="2.1" fill="#fff" opacity="0.9" />
      <circle cx="62.5" cy="43.5" r="2.1" fill="#fff" opacity="0.9" />
      <circle cx="34" cy="48.5" r="1" fill="#fff" opacity="0.35" />
      <circle cx="58" cy="48.5" r="1" fill="#fff" opacity="0.35" />

      {/* flat black muzzle */}
      <ellipse cx="48" cy="58" rx="11" ry="8" fill="#0a0a0a" />
      <ellipse cx="48" cy="55" rx="5.5" ry="3.5" fill="#1f1f1f" />
      <ellipse cx="46" cy="53.8" rx="1.6" ry="1" fill="#666" opacity="0.55" />

      {/* mouth line */}
      <path
        d={sad ? "M40 63 Q48 61 56 63" : "M40 63 Q48 66 56 63"}
        fill="none"
        stroke="#000"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path d="M48 58 V64" stroke="#000" strokeWidth="1.2" />
    </g>
  );
}



