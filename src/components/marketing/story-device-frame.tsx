"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Shared device chrome for home page 2–3.
 * - ≤479px: tall phone, nearly fullscreen
 * - 480–767px: normal tall phone with margins
 * - ≥768px: Fold-like 5:4 (current desktop look)
 */
export function StoryDeviceFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex h-full max-h-full w-full max-w-[min(98vw,460px)] items-center justify-center max-[479px]:max-w-[min(99vw,480px)] min-[480px]:max-md:max-w-[min(84vw,400px)] md:max-w-[min(100%,620px)]",
        className
      )}
    >
      <div
        className={cn(
          "relative h-full max-h-full w-auto max-w-full border-[#f4f4f5]/90 bg-[#0c0e14] shadow-[0_22px_56px_rgba(0,0,0,0.5)]",
          "rounded-[2rem] border-[5px] p-[3px] max-[479px]:rounded-[1.85rem]",
          "min-[480px]:max-md:rounded-[2.1rem] min-[480px]:max-md:border-[6px]",
          "md:rounded-[1.15rem] md:border-[3px]",
          // Height-first fit so captions below the frame never get clipped.
          "aspect-[9/19.5] md:aspect-[5/4]"
        )}
      >
        {/* Phone side buttons */}
        <div className="pointer-events-none absolute top-[18%] -left-[5px] z-30 h-10 w-[3px] rounded-l-sm bg-[#c8c8c8]/45 md:hidden" />
        <div className="pointer-events-none absolute top-[28%] -left-[5px] z-30 h-14 w-[3px] rounded-l-sm bg-[#c8c8c8]/35 md:hidden" />
        <div className="pointer-events-none absolute top-[22%] -right-[5px] z-30 h-16 w-[3px] rounded-r-sm bg-[#c8c8c8]/45 md:hidden" />

        {/* Fold hinge nubs */}
        <div className="pointer-events-none absolute top-1/2 left-0 z-30 hidden h-7 w-[2px] -translate-y-[120%] rounded-r-sm bg-[#c8c8c8]/40 md:block" />
        <div className="pointer-events-none absolute top-1/2 right-0 z-30 hidden h-7 w-[2px] -translate-y-[120%] rounded-l-sm bg-[#c8c8c8]/40 md:block" />

        <div
          className={cn(
            "relative h-full w-full overflow-hidden bg-[#0c0e14]",
            "rounded-[1.55rem] max-[479px]:rounded-[1.4rem]",
            "min-[480px]:max-md:rounded-[1.65rem]",
            "md:rounded-[0.85rem]"
          )}
        >
          <div
            className="pointer-events-none absolute inset-y-0 left-1/2 z-20 hidden w-10 -translate-x-1/2 md:block"
            aria-hidden="true"
            style={{
              background:
                "radial-gradient(ellipse 70% 100% at 50% 50%, rgba(255,255,255,0.04) 0%, transparent 55%), linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.04) 30%, rgba(255,255,255,0.035) 45%, rgba(255,255,255,0.05) 50%, rgba(0,0,0,0.03) 55%, rgba(0,0,0,0.04) 70%, transparent 100%)",
            }}
          />

          <StoryDeviceStatusBar />
          <div className="relative z-10 h-[calc(100%-1.75rem)]">{children}</div>
        </div>
      </div>
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

/** Dual-pane row on Fold; stacked column on phone. */
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
        "flex h-[calc(100%-0.25rem)] flex-col gap-2 px-3 pt-1 pb-3 md:h-[calc(100%-2rem)] md:flex-row md:gap-3",
        className
      )}
    >
      {children}
    </div>
  );
}
