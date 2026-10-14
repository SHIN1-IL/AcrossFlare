"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Shared iPhone Duo chrome (home stories + marketing phone mocks).
 * Physical shell: 164.6 × 117.8 mm. Landscape on tablet/laptop; portrait on phone.
 * Flat screen only — no center crease. Corners stay squared-off.
 */
export const STORY_DEVICE = {
  /** Real duo width — landscape 164.6mm, portrait 117.8mm. Never fills the viewport. */
  shellMax: "max-w-[min(92vw,164.6mm)] max-[479px]:max-w-[min(88vw,117.8mm)]",
  /** Landscape 164.6:117.8 · portrait 117.8:164.6 (phone only). */
  aspect: "aspect-[1646/1178] max-[479px]:aspect-[1178/1646]",
  /** Angular corners (sharper than soft phone curves). */
  outerRadius: "rounded-[6px]",
  innerRadius: "rounded-[3px]",
  border: "border-[3px]",
  pad: "p-[3px]",
} as const;

export function StoryDeviceFrame({
  children,
  className,
  /** When set, plays a one-shot soft light-ray reflection (~4s) on first show / replay. */
  shineKey,
}: {
  children: ReactNode;
  className?: string;
  shineKey?: string | number;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex h-full w-full items-center justify-center",
        className
      )}
    >
      <div
        className={cn(
          "relative w-full border-[#f4f4f5]/90 bg-[#0c0e14] shadow-[0_22px_56px_rgba(0,0,0,0.5)]",
          STORY_DEVICE.shellMax,
          STORY_DEVICE.aspect,
          STORY_DEVICE.outerRadius,
          STORY_DEVICE.border,
          STORY_DEVICE.pad
        )}
      >
        {/* Portrait (phone): volume left, power right */}
        <div className="pointer-events-none absolute top-[18%] -left-[4px] z-30 h-10 w-[3px] rounded-[1px] bg-[#c8c8c8]/45 max-[479px]:block min-[480px]:hidden" />
        <div className="pointer-events-none absolute top-[32%] -left-[4px] z-30 h-7 w-[3px] rounded-[1px] bg-[#c8c8c8]/35 max-[479px]:block min-[480px]:hidden" />
        <div className="pointer-events-none absolute top-[22%] -right-[4px] z-30 h-12 w-[3px] rounded-[1px] bg-[#c8c8c8]/45 max-[479px]:block min-[480px]:hidden" />

        {/* Landscape (tablet/laptop): single power on right short edge, near top */}
        <div className="pointer-events-none absolute top-[14%] -right-[4px] z-30 hidden h-11 w-[3px] rounded-[1px] bg-[#c8c8c8]/50 min-[480px]:block" />

        {/* Bottom edge: USB-C + speaker grilles (product silhouette) */}
        <div
          className="pointer-events-none absolute bottom-[-5px] left-1/2 z-30 flex -translate-x-1/2 items-center gap-3"
          aria-hidden="true"
        >
          <span className="flex gap-[2px]">
            <span className="h-[2px] w-[2px] rounded-full bg-[#c8c8c8]/35" />
            <span className="h-[2px] w-[2px] rounded-full bg-[#c8c8c8]/35" />
            <span className="h-[2px] w-[2px] rounded-full bg-[#c8c8c8]/35" />
            <span className="h-[2px] w-[2px] rounded-full bg-[#c8c8c8]/35" />
          </span>
          <span className="h-[3px] w-5 rounded-[1px] bg-[#c8c8c8]/40" />
          <span className="flex gap-[2px]">
            <span className="h-[2px] w-[2px] rounded-full bg-[#c8c8c8]/35" />
            <span className="h-[2px] w-[2px] rounded-full bg-[#c8c8c8]/35" />
            <span className="h-[2px] w-[2px] rounded-full bg-[#c8c8c8]/35" />
            <span className="h-[2px] w-[2px] rounded-full bg-[#c8c8c8]/35" />
          </span>
        </div>

        <div
          className={cn(
            "relative h-full w-full overflow-hidden bg-[#0c0e14]",
            STORY_DEVICE.innerRadius
          )}
        >
          <StoryDeviceStatusBar />
          <div className="relative z-10 h-[calc(100%-1.75rem)]">
            {children}
            {shineKey != null ? <StoryScreenShine replayKey={shineKey} /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Soft light-ray reflection — once per replayKey, ~2s, no loop. */
function StoryScreenShine({ replayKey }: { replayKey: string | number }) {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  if (reduced) return null;

  return (
    <div
      key={replayKey}
      className="pointer-events-none absolute inset-0 z-50 overflow-hidden"
      aria-hidden="true"
    >
      <style>{`
        @keyframes af-screen-shine-sweep {
          0% { opacity: 0; transform: translateX(-55%) skewX(-16deg); }
          12% { opacity: 1; }
          55% { opacity: 0.55; }
          100% { opacity: 0; transform: translateX(125%) skewX(-16deg); }
        }
        @keyframes af-screen-shine-rays {
          0% { opacity: 0; }
          18% { opacity: 0.9; }
          70% { opacity: 0.35; }
          100% { opacity: 0; }
        }
      `}</style>
      {/* Broad glass sweep */}
      <div
        className="absolute inset-y-[-10%] left-0 w-[42%]"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.03) 28%, rgba(255,255,255,0.14) 48%, rgba(226,232,240,0.1) 58%, rgba(255,255,255,0.03) 72%, transparent 100%)",
          animation: "af-screen-shine-sweep 2s cubic-bezier(0.33, 0.1, 0.25, 1) both",
        }}
      />
      {/* Thin light rays */}
      <div
        className="absolute inset-y-[-12%] left-0 w-[36%] mix-blend-screen"
        style={{
          background:
            "repeating-linear-gradient(105deg, transparent 0 10px, rgba(255,255,255,0.045) 10px 11px, transparent 11px 22px)",
          maskImage:
            "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.8) 35%, rgba(0,0,0,0.8) 65%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.8) 35%, rgba(0,0,0,0.8) 65%, transparent 100%)",
          animation:
            "af-screen-shine-sweep 2s cubic-bezier(0.33, 0.1, 0.25, 1) both, af-screen-shine-rays 2s ease-out both",
        }}
      />
    </div>
  );
}

function StoryDeviceStatusBar() {
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

/** Dual panes — stacked on phone (portrait), side-by-side on tablet/laptop (landscape). */
export function StoryDevicePanes({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-full flex-col gap-2 px-2.5 pt-1 pb-2.5 min-[480px]:flex-row min-[480px]:gap-3 min-[480px]:px-3 min-[480px]:pb-3",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Class string for non-StoryDeviceFrame phone shells that should match the duo chrome. */
export function storyDeviceShellClassName(className?: string) {
  return cn(
    "relative w-full overflow-hidden border-[3px] border-[#f4f4f5]/90 bg-[#0c0e14] shadow-[0_16px_36px_rgba(0,0,0,0.34)]",
    STORY_DEVICE.aspect,
    STORY_DEVICE.outerRadius,
    className
  );
}
