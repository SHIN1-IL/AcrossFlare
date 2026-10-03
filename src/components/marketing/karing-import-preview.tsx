"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import styles from "./karing-import-preview.module.css";

const PREVIEW_URL = "https://sub.acrossflare.com/\u2026";

const QR_CELLS = [
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

/** Step 3: real Karing Add Profile Link paste + QR scan screens. */
export function KaringImportPreview() {
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
      {/* Add Profile Link */}
      <div className="w-[min(48%,210px)] overflow-hidden rounded-[22px] border border-[#d8d8dc] bg-white text-[#1c1c1e] shadow-[0_12px_28px_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-between px-3 pt-2 text-[8px] text-[#6b6b70]">
          <span>9:41</span>
          <span className="font-medium">Karing</span>
          <span className="relative h-[7px] w-[13px] rounded-[1.5px] border border-current">
            <span className="absolute inset-y-px left-px w-[8px] bg-current" />
          </span>
        </div>

        <div className="relative flex items-center justify-center px-3 py-2">
          <span className="absolute left-3 text-[13px] text-[#3a3a3c]">‹</span>
          <span className="text-[10px] font-semibold">{t("setup.preview.linkTitle")}</span>
          <span className="absolute right-3 text-[12px] font-semibold text-[#1c1c1e]">✓</span>
          <span
            className={cn(
              styles?.checkTap,
              "pointer-events-none absolute top-1/2 right-2 size-7 -translate-y-1/2 rounded-full border-2 border-emerald-500 bg-emerald-400/25"
            )}
          />
        </div>

        <div className="border-t border-[#ececf0] px-2.5 pt-1">
          <SettingRow
            label="UserAgent"
            value="sing-box 1.12.0;mihomo/…"
            chevron
          />
          <SettingRow label="Filter" chevron />
          <SettingRow label={t("setup.preview.link.keepRules")} toggleOff />
          <SettingRow label="Download Channel" value="Prefer Current Selected" dropdown />
          <SettingRow label="Update interval" value="12 h" underline />
          <SettingRow label={t("setup.preview.link.autoRemove")} toggleOff last />
        </div>

        <div className="relative mx-2.5 mt-2 mb-3 h-[72px] overflow-hidden rounded-md border border-[#1c1c1e] bg-white px-2 py-1.5">
          <span
            className={cn(
              styles?.placeholder,
              "absolute top-1.5 left-2 text-[9px] text-[#b0b0b5]"
            )}
          >
            {t("setup.preview.link.placeholder")}
          </span>
          <div className="relative h-full overflow-hidden">
            <span
              className={cn(
                styles?.urlText,
                "block font-mono text-[8px] leading-4 break-all text-[#1c1c1e]"
              )}
            >
              {PREVIEW_URL}
            </span>
            <span className={cn(styles?.mask, "absolute inset-0 bg-white")} />
          </div>
        </div>
      </div>

      {/* QR 코드 스캔 */}
      <div className="w-[min(48%,210px)] overflow-hidden rounded-[22px] border border-[#d8d8dc] bg-white text-[#1c1c1e] shadow-[0_12px_28px_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-between px-2.5 pt-2 text-[8px] text-[#3a3a3c]">
          <span>KT 13:13</span>
          <span className="flex items-center gap-0.5">
            <span className="text-[7px]">62%</span>
            <span className="relative h-[7px] w-[13px] rounded-[1.5px] border border-current">
              <span className="absolute inset-y-px left-px w-[8px] bg-current" />
            </span>
          </span>
        </div>

        <div className="relative flex items-center px-2.5 py-2">
          <span className="text-[13px] text-[#1c1c1e]">‹</span>
          <span className="absolute inset-x-0 text-center text-[10px] font-semibold">
            {t("setup.preview.scanTitle")}
          </span>
          <span className="ml-auto flex items-center gap-1.5 text-[#1c1c1e]">
            <GalleryIcon />
            <FlashOffIcon />
            <span className="relative text-[12px] font-semibold">
              ✓
              <span
                className={cn(
                  styles?.scanCheck,
                  "pointer-events-none absolute top-1/2 left-1/2 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-emerald-500 bg-emerald-400/25"
                )}
              />
            </span>
          </span>
        </div>

        <div className="relative aspect-[3/4] bg-[#6a6a6e]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,#8a8a8e_0%,#5c5c60_70%)]" />
          <div className="absolute inset-[18%] overflow-hidden rounded-sm bg-[#7a7a7e]/55">
            <div
              className={cn(
                styles?.qrCard,
                "absolute inset-[14%] flex items-center justify-center"
              )}
            >
              <FakeQr />
            </div>
            <div
              className={cn(
                styles?.scanLine,
                "pointer-events-none absolute inset-x-[8%] top-1/2 h-0.5 -translate-y-1/2 bg-red-500/80"
              )}
            />
          </div>
          <RedCorner className="absolute top-[18%] left-[18%]" />
          <RedCorner className="absolute top-[18%] right-[18%] rotate-90" />
          <RedCorner className="absolute right-[18%] bottom-[18%] rotate-180" />
          <RedCorner className="absolute bottom-[18%] left-[18%] -rotate-90" />
        </div>
      </div>
    </div>
  );
}

function SettingRow({
  label,
  value,
  chevron,
  dropdown,
  underline,
  toggleOff,
  last,
}: {
  label: string;
  value?: string;
  chevron?: boolean;
  dropdown?: boolean;
  underline?: boolean;
  toggleOff?: boolean;
  last?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-1.5 py-1.5 text-[7.5px] leading-snug",
        last ? undefined : "border-b border-[#ececf0]"
      )}
    >
      <InfoDot />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-[#1c1c1e]">{label}</p>
        {value ? (
          <p
            className={cn(
              "mt-0.5 truncate text-[#6b6b70]",
              underline ? "underline decoration-[#1c1c1e]/40" : undefined
            )}
          >
            {value}
            {dropdown ? <span className="ml-0.5 text-[6px]">▾</span> : null}
          </p>
        ) : null}
      </div>
      {chevron ? <span className="pt-0.5 text-[#c4c4c8]">›</span> : null}
      {toggleOff ? (
        <span className="mt-0.5 h-2.5 w-4 shrink-0 rounded-full bg-[#d1d1d6]">
          <span className="mt-0.5 ml-0.5 block size-1.5 rounded-full bg-white shadow" />
        </span>
      ) : null}
    </div>
  );
}

function InfoDot() {
  return (
    <span className="mt-0.5 inline-flex size-2.5 shrink-0 items-center justify-center rounded-full border border-[#8b8b93] text-[6px] leading-none text-[#8b8b93]">
      i
    </span>
  );
}

function RedCorner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "pointer-events-none block size-4 rounded-tl-[3px] border-t-[3px] border-l-[3px] border-[#e11d48]",
        className
      )}
    />
  );
}

function GalleryIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="5" width="14" height="14" rx="2" />
      <path d="M8 15l3-3 3 2 3-4" />
      <path d="M16 17h4v-4" />
    </svg>
  );
}

function FlashOffIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M13 2L6 13h5l-1 9 8-12h-5l1-8z" />
      <path d="M4 4l16 16" />
    </svg>
  );
}

function FakeQr() {
  return (
    <div className="aspect-square w-full rounded-[2px] bg-white p-[3px] shadow-[0_2px_10px_rgba(0,0,0,0.18)]">
      <div
        className="grid size-full gap-px"
        style={{ gridTemplateColumns: `repeat(${QR_CELLS[0]!.length}, minmax(0, 1fr))` }}
      >
        {QR_CELLS.flatMap((row, y) =>
          row.split("").map((bit, x) => (
            <span key={`${y}-${x}`} className={bit === "1" ? "bg-black" : "bg-white"} />
          ))
        )}
      </div>
    </div>
  );
}
