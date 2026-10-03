"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import styles from "./karing-ping-preview.module.css";

const TOKYO_SPIN = ["128", "87", "61", "52", "39", "43"];
const LA_SPIN = ["220", "188", "165", "151", "142", "149"];

/** Step 4 right: Select Server — tap lightning → Tokyo/LA ping settle green. */
export function KaringPingPreview() {
  const t = useTranslations("support");
  const stageRef = useRef<HTMLDivElement>(null);
  const [play, setPlay] = useState(false);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry?.isIntersecting ?? false;
        setPlay((current) => (current === visible ? current : visible));
      },
      { threshold: 0.35 }
    );
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={stageRef}
      aria-hidden="true"
      data-play={play ? "" : undefined}
      className={cn(styles?.stage, "pointer-events-none flex h-full min-h-full w-full select-none")}
    >
      <div className="flex h-full min-h-full w-full flex-col overflow-hidden rounded-[22px] border border-[#d8d8dc] bg-white text-[#1c1c1e] shadow-[0_12px_28px_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-between px-3 pt-2 text-[9px] text-[#6b6b70]">
          <span>9:41</span>
          <span className="font-medium">Karing</span>
          <span className="relative h-[7px] w-[13px] rounded-[1.5px] border border-current">
            <span className="absolute inset-y-px left-px w-[8px] bg-current" />
          </span>
        </div>

        <div className="relative flex items-center px-2.5 py-2">
          <span className="text-[13px] text-[#3a3a3c]">‹</span>
          <span className="absolute inset-x-0 text-center text-[10px] font-semibold">
            {t("setup.preview.ping.selectServer")}
          </span>
          <span className="relative ml-auto flex items-center gap-2 text-[#1c1c1e]">
            <span className="relative">
              <BoltIcon />
              <span
                className={cn(
                  styles?.boltRipple,
                  "pointer-events-none absolute top-1/2 left-1/2 size-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-emerald-500 bg-emerald-400/30"
                )}
              />
            </span>
            <GearTiny />
          </span>
        </div>

        <p className="px-3 pb-1 text-[8px] font-semibold text-[#6b6b70]">
          {t("setup.preview.ping.recent")}
        </p>

        <div className="px-2 pb-1">
          <ServerRow
            index={1}
            name="node-tokyo"
            selectedClass={styles?.tokyoSel}
            pingClass={styles?.pingTokyo}
            spin={TOKYO_SPIN}
            finalMs="43"
          />
          <ServerRow
            index={2}
            name="node-la-a"
            pingClass={styles?.pingLa}
            spin={LA_SPIN}
            finalMs="149"
          />
        </div>

        {/* Empty remainder so phone matches left height */}
        <div className="min-h-0 flex-1 bg-white" />
      </div>
    </div>
  );
}

function ServerRow({
  index,
  name,
  selectedClass,
  pingClass,
  spin,
  finalMs,
}: {
  index: number;
  name: string;
  selectedClass?: string;
  pingClass?: string;
  spin: string[];
  finalMs: string;
}) {
  return (
    <div
      className={cn(
        "mb-0.5 flex items-center gap-1.5 rounded-md px-1.5 py-1.5 text-[8px]",
        selectedClass
      )}
    >
      <span className="w-3 shrink-0 opacity-70">{index}</span>
      <span className="min-w-0 flex-1 truncate font-medium">{name}</span>
      <span className="shrink-0 text-[7px] opacity-60">vless</span>
      <span className={cn(pingClass, "relative h-[12px] w-10 shrink-0 overflow-hidden text-right font-semibold")}>
        <span className={cn("spin absolute inset-0")}>
          <span className={cn(styles?.spinTrack, "absolute inset-x-0 top-0")}>
            {spin.map((ms) => (
              <span key={ms} className="block h-[12px] leading-[12px]">
                {ms} ms
              </span>
            ))}
          </span>
        </span>
        <span className={cn("final absolute inset-0 leading-[12px]")}>{finalMs} ms</span>
      </span>
    </div>
  );
}

function BoltIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className="text-[#1c1c1e]">
      <path d="M13 2L4 14h7l-1 8 10-14h-7l0-6z" />
    </svg>
  );
}

function GearTiny() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}
