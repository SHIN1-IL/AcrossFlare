"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import styles from "./karing-connect-preview.module.css";

/** Step 3 banner: Karing main — red tap → green connected (node-tokyo / 43 ms). */
export function KaringConnectPreview() {
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
      <div className="flex h-full min-h-full w-full flex-col overflow-hidden rounded-[22px] border border-[#d8d8dc] bg-[#e9e9ee] text-[#1c1c1e] shadow-[0_12px_28px_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-between px-3 pt-2 text-[9px] text-[#6b6b70]">
          <span>9:41</span>
          <span className="font-medium">Karing</span>
          <span className="relative h-[7px] w-[13px] rounded-[1.5px] border border-current">
            <span className="absolute inset-y-px left-px w-[8px] bg-current" />
          </span>
        </div>

        <div className="flex items-center gap-2 px-3 pt-1.5 pb-1">
          <span className="relative text-[#3a3a3c]">
            <GearIcon />
            <span className="absolute -top-0.5 -left-0.5 size-1.5 rounded-full bg-red-500" />
          </span>
          <PencilIcon />
          <span className="ml-auto text-[10px] font-medium text-[#6b6b70]">Karing</span>
        </div>

        <div className="grid grid-cols-4 gap-1 px-2.5">
          {(
            [
              [t("setup.preview.connect.time"), "0:00:17"],
              [t("setup.preview.connect.peers"), "10"],
              [t("setup.preview.connect.traffic"), "↑OO\n↓OO"],
              [t("setup.preview.connect.speed"), "0 B/s"],
            ] as const
          ).map(([label, value], i) => (
            <div key={label} className="rounded-lg bg-white px-1 py-1 shadow-sm">
              <p className="text-[6px] text-[#8b8b93]">{label}</p>
              <p
                className={cn(
                  "text-[8px] leading-tight font-semibold whitespace-pre-line",
                  styles?.stat,
                  i === 0 ? styles?.statOn : undefined
                )}
              >
                {value}
              </p>
            </div>
          ))}
        </div>

        <div className="mx-2.5 mt-1.5 rounded-xl bg-white px-2.5 py-1.5 shadow-sm">
          <p className="text-[7px] font-semibold text-[#3a3a3c]">Current Profile</p>
          <p className="text-[10px] font-medium">AcrossFlare</p>
          <p className="text-[7px] text-[#8b8b93]">↑ 0 B ↓ OO GB</p>
          <p className={cn("text-[8px] font-semibold text-[#e11d48]", styles?.dateOff)}>OO/OO/OOOO</p>
        </div>

        <div className="mx-2.5 mt-1.5 flex overflow-hidden rounded-md text-[8px] font-medium shadow-sm">
          <span className="flex-1 bg-[#d6d6dc] px-2 py-1.5 text-center">Rule</span>
          <span className="flex-1 bg-white px-2 py-1.5 text-center text-[#8b8b93]">Global</span>
        </div>

        <div className="mx-2.5 mt-1.5 grid grid-cols-4 gap-1 text-[7px]">
          <div className="flex flex-col justify-between rounded-xl bg-white px-1.5 py-1.5 shadow-sm">
            <span>System Proxy</span>
            <span className="mt-1 h-2.5 w-4 self-end rounded-full bg-[#d1d1d6]">
              <span className="mt-0.5 ml-0.5 block size-1.5 rounded-full bg-white shadow" />
            </span>
          </div>
          {["My Profiles", "DNS", "Add Profile"].map((label) => (
            <div key={label} className="rounded-xl bg-white px-1.5 py-1.5 shadow-sm">
              {label}
            </div>
          ))}
        </div>

        <div className="relative mt-auto flex flex-col items-center pt-2">
          <div className="relative z-10 mb-[-12px]">
            <div
              className={cn(
                styles?.shield,
                "flex size-[52px] items-center justify-center rounded-full border-[4px] bg-[#e9e9ee] shadow-[0_6px_16px_rgba(0,0,0,0.12)]"
              )}
            >
              <span className={cn(styles?.shieldOff, "absolute")}>
                <ShieldX />
              </span>
              <span className={cn(styles?.shieldOn, "absolute")}>
                <ShieldCheck />
              </span>
            </div>
          </div>
          <div className="flex w-full items-end justify-between bg-white px-3 pt-3.5 pb-2 text-[9px] shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
            <span className="w-8" />
            <span className="font-medium text-[#3a3a3c]">{t("setup.preview.connect.node")}</span>
            <span className={cn("font-semibold", styles?.latency)}>
              {t("setup.preview.connect.latency")}
            </span>
          </div>
        </div>
      </div>
    </div>
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

function ShieldX() {
  return (
    <svg viewBox="0 0 48 48" className="size-6" fill="none">
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
    <svg viewBox="0 0 48 48" className="size-6" fill="none">
      <path
        d="M24 8c-7 0-14 3.5-14 10v6c0 8 6 14 14 16 8-2 14-8 14-16v-6c0-6.5-7-10-14-10Z"
        fill="#28c840"
      />
      <path d="M18 24l4 4 8-9" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
