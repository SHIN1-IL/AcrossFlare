"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import styles from "./karing-add-profile-preview.module.css";

/** Step 2: both phones main → Add Profile → menu; left taps Link, right taps Scan QR. */
export function KaringAddProfilePreview() {
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
      className={cn(styles?.stage, "pointer-events-none mt-4 flex w-full max-w-[460px] select-none gap-3")}
    >
      <PhoneShell>
        <MainScreen
          t={t}
          addRipple={
            <span
              className={cn(
                styles?.ripple,
                "pointer-events-none absolute top-1/2 left-1/2 size-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-emerald-500 bg-emerald-400/25"
              )}
            />
          }
        />
        <MenuScreen
          t={t}
          highlight="link"
          menuRipple={
            <span
              className={cn(
                styles?.rippleLink,
                "pointer-events-none absolute top-1/2 left-[34%] size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-emerald-500 bg-emerald-400/25"
              )}
            />
          }
        />
      </PhoneShell>

      <PhoneShell>
        <MainScreen
          t={t}
          addRipple={
            <span
              className={cn(
                styles?.ripple,
                "pointer-events-none absolute top-1/2 left-1/2 size-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-emerald-500 bg-emerald-400/25"
              )}
            />
          }
        />
        <MenuScreen
          t={t}
          highlight="scan"
          menuRipple={
            <span
              className={cn(
                styles?.rippleScan,
                "pointer-events-none absolute top-1/2 left-[34%] size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-emerald-500 bg-emerald-400/25"
              )}
            />
          }
        />
      </PhoneShell>
    </div>
  );
}

function PhoneShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative aspect-[9/14] w-[min(48%,210px)] overflow-hidden rounded-[22px] border border-[#d8d8dc] bg-[#e9e9ee] text-[#1c1c1e] shadow-[0_12px_28px_rgba(0,0,0,0.1)]">
      {children}
    </div>
  );
}

function MainScreen({
  t,
  addRipple,
}: {
  t: (key: string) => string;
  addRipple: ReactNode;
}) {
  return (
    <div className={cn(styles?.main, "flex flex-col")}>
      <StatusBar />
      <div className="flex items-center gap-2 px-3 pt-1.5 pb-1">
        <span className="relative text-[#3a3a3c]">
          <GearIcon />
          <span className="absolute -top-0.5 -left-0.5 size-1.5 rounded-full bg-red-500" />
        </span>
        <PencilIcon />
      </div>

      <div className="grid grid-cols-4 gap-1 px-2.5">
        {(
          [
            [t("setup.preview.connect.time"), "0:00:00"],
            [t("setup.preview.connect.peers"), ""],
            [t("setup.preview.connect.traffic"), "↑ 0 B\n↓ 0 B"],
            [t("setup.preview.connect.speed"), "↑ 0 B/s\n↓ 0 B/s"],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="rounded-lg bg-white px-1 py-1.5 shadow-sm">
            <p className="text-[6px] text-[#8b8b93]">{label}</p>
            <p className="min-h-[1.6em] text-[8px] leading-tight font-semibold whitespace-pre-line">
              {value || "\u00a0"}
            </p>
          </div>
        ))}
      </div>

      <div className="mx-2.5 mt-1.5 rounded-xl bg-white px-2.5 py-1.5 shadow-sm">
        <p className="text-[7px] font-semibold text-[#3a3a3c]">Current Profile</p>
        <p className="text-[10px] font-medium">AcrossFlare</p>
        <p className="text-[7px] text-[#8b8b93]">↑ 0 B ↓ 7.1 GB / 0 B</p>
        <p className="text-[8px] font-semibold text-[#e11d48]">10/8/2026</p>
      </div>

      <div className="mx-2.5 mt-1.5 flex overflow-hidden rounded-md text-[8px] font-medium shadow-sm">
        <span className="flex-1 bg-[#d6d6dc] px-2 py-1.5 text-center">Rule</span>
        <span className="flex-1 bg-white px-2 py-1.5 text-center text-[#8b8b93]">Global</span>
      </div>

      <div className="mx-2.5 mt-1.5 grid grid-cols-2 gap-1.5 text-[8px]">
        <div className="flex items-center justify-between rounded-xl bg-white px-2 py-2 shadow-sm">
          <span>System Proxy</span>
          <span className="h-2.5 w-4 rounded-full bg-[#d1d1d6]">
            <span className="mt-0.5 ml-0.5 block size-1.5 rounded-full bg-white shadow" />
          </span>
        </div>
        <div className="rounded-xl bg-white px-2 py-2 shadow-sm">My Profiles</div>
        <div className="rounded-xl bg-white px-2 py-2 shadow-sm">DNS</div>
        <div className="relative rounded-xl bg-white px-2 py-2 font-semibold shadow-sm">
          <span className="inline-flex items-center gap-1">
            <span className="text-[11px] leading-none">+</span>
            {t("setup.preview.addProfile")}
          </span>
          {addRipple}
        </div>
      </div>
    </div>
  );
}

function MenuScreen({
  t,
  highlight,
  menuRipple,
}: {
  t: (key: string) => string;
  highlight: "link" | "scan";
  menuRipple: ReactNode;
}) {
  const rows = [
    ["link", t("setup.preview.menu.link")],
    ["clip", t("setup.preview.menu.clipboard")],
    ["file", t("setup.preview.menu.file")],
    ["scan", t("setup.preview.menu.scan")],
    ["custom", t("setup.preview.menu.custom")],
  ] as const;

  return (
    <div className={cn(styles?.menu, "flex flex-col bg-[#e9e9ee]")}>
      <StatusBar />
      <div className="relative flex items-center justify-center px-3 py-2">
        <span className="absolute left-3 text-[13px] text-[#3a3a3c]">‹</span>
        <span className="text-[10px] font-semibold">{t("setup.preview.addProfile")}</span>
      </div>

      <div className="space-y-2 px-2.5 pb-3">
        <MenuCard rows={["Get Traffic", "Tutorial", "FAQ", "Commonly Used Rulesets"]} />
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          {rows.map(([key, label], i) => (
            <div
              key={key}
              className={cn(
                "relative flex items-center justify-between px-3 py-2 text-[9px]",
                i < rows.length - 1 ? "border-b border-[#ececf0]" : undefined
              )}
            >
              <span className="font-medium">{label}</span>
              <span className="text-[#c4c4c8]">›</span>
              {key === highlight ? menuRipple : null}
            </div>
          ))}
        </div>
        <MenuCard rows={["Backup and Sync"]} />
      </div>
    </div>
  );
}

function StatusBar() {
  return (
    <div className="flex items-center justify-between px-3 pt-2 text-[9px] text-[#6b6b70]">
      <span>9:41</span>
      <span className="font-medium">Karing</span>
      <span className="relative h-[7px] w-[13px] rounded-[1.5px] border border-current">
        <span className="absolute inset-y-px left-px w-[8px] bg-current" />
      </span>
    </div>
  );
}

function MenuCard({ rows }: { rows: string[] }) {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm">
      {rows.map((label, i) => (
        <div
          key={label}
          className={cn(
            "flex items-center justify-between px-3 py-2 text-[9px]",
            i < rows.length - 1 ? "border-b border-[#ececf0]" : undefined
          )}
        >
          <span>{label}</span>
          <span className="text-[#c4c4c8]">›</span>
        </div>
      ))}
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
