"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { HeroGrain } from "@/components/marketing/hero-grain";

/**
 * Scroll story in the same Fold device as page 2:
 * console + QR scan → zoom → Karing red→green.
 * Personal details masked as OO.
 */
export function ConsoleKaringStory({ className }: { className?: string }) {
  const sectionRef = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const onScroll = () => {
      const rect = section.getBoundingClientRect();
      const total = section.offsetHeight - window.innerHeight;
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

  // 0–0.40 console+QR · 0.40–0.60 zoom · 0.60–0.76 cursor · 0.76–1 green
  const phase1 = progress < 0.4;
  const zoomT = smoothstep((progress - 0.36) / 0.28);
  const showKaring = progress >= 0.4 && zoomT >= 0.4;
  const clicked = progress >= 0.72;
  const greenT = smoothstep((progress - 0.72) / 0.2);
  const press = clicked && greenT < 0.18;

  return (
    <section
      ref={sectionRef}
      data-home-page
      className={cn("relative h-[240vh] snap-start bg-[#14181e] max-md:snap-start", className)}
    >
      <div className="sticky top-0 h-dvh overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(226,232,240,0.06),transparent_32%,rgba(0,0,0,0.28)),repeating-linear-gradient(90deg,rgba(255,255,255,0.04)_0px,rgba(255,255,255,0.04)_1px,transparent_1px,transparent_5px)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[360px] bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.1),transparent_55%)]" />
        <HeroGrain />

        <div className="absolute inset-x-0 top-9 z-20 flex flex-col items-center px-4 text-center sm:top-11">
          <h1 className="text-[clamp(1.85rem,5.5vw,3rem)] leading-[0.95] font-semibold tracking-[-0.04em] text-[#f4f4f5]">
            AcrossFlare
          </h1>
          <p className="mt-2 text-[clamp(0.72rem,1.8vw,1rem)] whitespace-nowrap text-[#888888]">
            Secure Cloud & Network Optimization
          </p>
          <p className="mt-3 text-[clamp(0.8rem,1.6vw,1rem)] font-medium text-emerald-300/90">
            {phase1 ? "콘솔 QR을 스캔해 구독 연결" : "한 번의 탭으로 Karing 가동"}
          </p>
        </div>

        <div className="absolute inset-x-0 top-[8.5rem] bottom-16 z-[5] flex flex-col items-center justify-center px-4 sm:top-[9.25rem]">
          <div
            className="relative w-full max-w-xl"
            style={{
              transform: `scale(${0.96 + zoomT * 0.12})`,
              opacity: progress < 0.03 ? Math.min(1, progress / 0.03) : 1,
            }}
          >
            <FoldDevice>
              {showKaring ? (
                <KaringFoldContent active={clicked} greenMix={greenT} pressed={press} />
              ) : (
                <QrScanFoldContent />
              )}
            </FoldDevice>
          </div>

          <p className="mt-5 max-w-xl text-center text-[clamp(0.78rem,1.5vw,0.95rem)] leading-snug text-[#c8c8c8]">
            {phase1
              ? "홈페이지 콘솔의 정사각 QR을 카메라에 맞추면 구독이 바로 반영됩니다."
              : clicked
                ? "적색 → 녹색. 암호화 네트워크가 가동됩니다."
                : "하단 적색 버튼을 누르면 AcrossFlare 프로파일이 활성화됩니다."}
          </p>
        </div>

        <div className="absolute inset-x-0 bottom-5 z-20 flex justify-center">
          <div className="h-1 w-36 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        </div>
      </div>
    </section>
  );
}

function smoothstep(t: number) {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/** Same Fold frame as why-buy-ui-story page 2. */
function FoldDevice({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-[min(100%,520px)]">
      <div className="relative rounded-[1.15rem] border-[3px] border-[#f4f4f5]/90 bg-[#0c0e14] p-[3px] shadow-[0_22px_56px_rgba(0,0,0,0.5)]">
        <div className="pointer-events-none absolute top-1/2 left-0 z-30 h-7 w-[2px] -translate-y-[120%] rounded-r-sm bg-[#c8c8c8]/40" />
        <div className="pointer-events-none absolute top-1/2 right-0 z-30 h-7 w-[2px] -translate-y-[120%] rounded-l-sm bg-[#c8c8c8]/40" />

        <div className="relative aspect-[5/4] overflow-hidden rounded-[0.85rem] bg-[#0c0e14]">
          <div
            className="pointer-events-none absolute inset-y-0 left-1/2 z-20 w-10 -translate-x-1/2"
            aria-hidden="true"
            style={{
              background:
                "radial-gradient(ellipse 70% 100% at 50% 50%, rgba(255,255,255,0.04) 0%, transparent 55%), linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.04) 30%, rgba(255,255,255,0.035) 45%, rgba(255,255,255,0.05) 50%, rgba(0,0,0,0.03) 55%, rgba(0,0,0,0.04) 70%, transparent 100%)",
            }}
          />

          <StatusBar />
          <div className="relative z-10 h-[calc(100%-1.75rem)]">{children}</div>
        </div>
      </div>
    </div>
  );
}

function StatusBar() {
  return (
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
          <path
            d="M1.5 3.5A1.5 1.5 0 0 1 3 2h8a1.5 1.5 0 0 1 1.5 1.5v.5H14a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1.5v.5A1.5 1.5 0 0 1 11 11H3A1.5 1.5 0 0 1 1.5 9.5v-6Z"
            opacity="0.35"
          />
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
  );
}

/** Left: console Standard/QR · Right: camera scan */
function QrScanFoldContent() {
  return (
    <div className="flex h-full gap-3 px-3 pb-3 pt-1">
      <div className="flex min-w-0 flex-1 flex-col rounded-xl border border-white/10 bg-[#090b0f] p-2.5">
        <div className="mb-1.5 flex items-center justify-between gap-1">
          <div className="flex items-center gap-1">
            <span className="flex size-4 items-center justify-center rounded bg-emerald-500 text-[8px] font-bold text-black">
              A
            </span>
            <span className="text-[10px] font-semibold text-[#f4f4f5]">Standard</span>
          </div>
          <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[8px] font-semibold text-emerald-300">
            활성
          </span>
        </div>
        <div className="mb-1.5 grid grid-cols-2 gap-1">
          <div className="rounded-md border border-white/8 bg-[#12151c] px-1.5 py-1">
            <p className="text-[7px] text-[#8b8b93]">만료</p>
            <p className="truncate text-[8px] font-medium text-[#e4e4e7]">OOOO년 OO월</p>
          </div>
          <div className="rounded-md border border-white/8 bg-[#12151c] px-1.5 py-1">
            <p className="text-[7px] text-[#8b8b93]">노드</p>
            <p className="truncate text-[8px] font-medium text-[#e4e4e7]">node-OO</p>
          </div>
        </div>
        <p className="mb-1 text-[9px] font-semibold text-[#f4f4f5]">Karing QR</p>
        <div className="mx-auto w-[72%] flex-1">
          <FakeQr />
        </div>
        <p className="mt-1 truncate text-[7px] text-[#6b6b73]">…/subscription/OOOO?flag=clash</p>
      </div>

      <div className="flex min-w-0 flex-1 flex-col rounded-xl border border-white/10 bg-[#12161c] p-2.5">
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-[11px] font-medium text-[#f4f4f5]">카메라</p>
          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-semibold text-emerald-300">
            Scan
          </span>
        </div>
        <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-lg bg-[#1c1c1e]">
          <div className="w-[58%]">
            <FakeQr />
          </div>
          <div className="pointer-events-none absolute inset-[14%] rounded-md border-2 border-emerald-400/85" />
          <div
            className="pointer-events-none absolute inset-x-[14%] h-0.5 bg-emerald-400/90 shadow-[0_0_12px_rgba(52,211,153,0.8)]"
            style={{ top: "40%", animation: "af-ck-scan 1.8s ease-in-out infinite" }}
          />
        </div>
        <p className="mt-1.5 text-center text-[8px] text-[#8b8b93]">콘솔 QR을 프레임에 맞춰 주세요</p>
        <style>{`
          @keyframes af-ck-scan {
            0%, 100% { transform: translateY(-22px); opacity: 0.35; }
            50% { transform: translateY(22px); opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  );
}

/** Full-width Karing main inside the same Fold screen */
function KaringFoldContent({
  active,
  greenMix,
  pressed,
}: {
  active: boolean;
  greenMix: number;
  pressed: boolean;
}) {
  const on = active || greenMix > 0.45;

  return (
    <div className="flex h-full flex-col bg-[#e9e9ee] text-[#1c1c1e]">
      <div className="flex items-center gap-2 px-3 pt-1 pb-1">
        <span className="relative text-[#3a3a3c]">
          <GearIcon />
          <span className="absolute -top-0.5 -left-0.5 size-1.5 rounded-full bg-red-500" />
        </span>
        <PencilIcon />
        <span className="ml-auto text-[10px] font-medium text-[#6b6b70]">Karing</span>
      </div>

      <div className="grid grid-cols-4 gap-1.5 px-2.5">
        {(
          [
            [<ClockIcon key="c" />, on ? "0:00:17" : "0:00:00"],
            [<MonitorIcon key="m" />, on ? "10" : "—"],
            [<TrafficIcon key="t" />, on ? "↑OO\n↓OO" : "↑0\n↓0"],
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
          <p className="text-[8px] font-semibold text-[#3a3a3c]">Current Profile</p>
          <p className="text-[10px] font-medium">AcrossFlare</p>
          <p className="text-[7px] text-[#8b8b93]">↑ 0 B ↓ OO GB · OO/OO/OOOO</p>
        </div>
        <div className="flex overflow-hidden rounded-md text-[8px] font-medium">
          <span className="bg-[#d6d6dc] px-2 py-1">Rule</span>
          <span className="bg-white px-2 py-1 text-[#8b8b93]">Global</span>
        </div>
      </div>

      <div className="mx-2.5 mt-1.5 grid flex-1 grid-cols-4 gap-1.5 text-[8px]">
        <div className="flex flex-col justify-between rounded-xl bg-white px-2 py-1.5 shadow-sm">
          <span>System Proxy</span>
          <span className="mt-1 h-3 w-5 self-end rounded-full bg-[#d1d1d6]">
            <span className="mt-0.5 ml-0.5 block size-2 rounded-full bg-white shadow" />
          </span>
        </div>
        {["My Profiles", "DNS", "Add Profile"].map((label) => (
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
              borderColor: on ? "#28c840" : "#e11d48",
              transform: `scale(${pressed ? 0.92 : 1 + greenMix * 0.03})`,
              transition: "border-color 220ms ease, transform 120ms ease",
            }}
          >
            {on ? <ShieldCheck /> : <ShieldX />}
          </div>
        </div>
        <div className="flex w-full items-end justify-between bg-white px-3 pt-4 pb-2 text-[9px] shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
          <span className="w-10" />
          <span className="font-medium text-[#3a3a3c]">node-OO</span>
          <span className={cn("font-semibold", on ? "text-emerald-600" : "text-[#8b8b93]")}>
            {on ? "43 ms ›" : "— ›"}
          </span>
        </div>
      </div>
    </div>
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
