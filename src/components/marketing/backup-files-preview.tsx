"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import styles from "./backup-files-preview.module.css";

/** Backup step 3: desktop file drags into the My files dashed drop zone. */
export function BackupFilesPreview() {
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
      className={cn(styles?.stage, "pointer-events-none mt-4 w-full max-w-[440px] select-none")}
    >
      <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-[#2a2a2e] shadow-[0_16px_40px_rgba(0,0,0,0.28)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,#1a3a32_0%,#0b0f12_45%,#07090b_100%)]" />
        <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:18px_18px]" />

        {/* Console backup window — My files drop zone is the drag target */}
        <div className="absolute top-3 left-3 z-10 flex h-[84%] w-[78%] overflow-visible rounded-lg border border-[#2a2a2e] bg-[#0b0b0d] text-white shadow-[0_10px_28px_rgba(0,0,0,0.45)]">
          <aside className="flex w-[54px] shrink-0 flex-col gap-0.5 border-r border-white/5 bg-[#0e0e10] px-1 py-1.5">
            <div className="mb-1 flex items-center gap-1 px-0.5">
              <span className="inline-flex size-3 items-center justify-center rounded-[3px] bg-[#34d399] text-[5px] font-bold text-[#062016]">
                Af
              </span>
              <span className="truncate text-[6px] font-semibold text-white/85">AcrossFlare</span>
            </div>
            {[
              t("backup.preview.overview"),
              t("backup.preview.nav"),
              "Standard",
              t("backup.preview.billing"),
            ].map((label, i) => (
              <div
                key={label}
                className={cn(
                  "rounded px-1 py-0.5 text-[6.5px]",
                  i === 1 ? "bg-[#34d399]/15 text-[#34d399]" : "text-white/50"
                )}
              >
                {label}
              </div>
            ))}
          </aside>

          <div className="min-w-0 flex-1 px-2 py-1.5">
            <div className="flex items-start justify-between gap-1">
              <div>
                <h3 className="text-[9px] font-semibold tracking-tight">
                  {t("backup.preview.backupTitle")}
                </h3>
                <p className="mt-0.5 line-clamp-1 text-[6px] text-white/40">
                  {t("backup.preview.backupDesc")}
                </p>
              </div>
              <span className="rounded-full border border-[#34d399]/70 px-1 py-0.5 text-[6px] text-[#34d399]">
                {t("backup.preview.active")}
              </span>
            </div>

            <div className="mt-1.5 grid grid-cols-[1fr_1.15fr] gap-1.5">
              <div className="rounded-md border border-white/8 bg-[#121416] p-1.5 opacity-45">
                <p className="text-[7px] font-semibold">{t("backup.preview.vaultName")}</p>
                <span className="mt-1.5 inline-flex rounded bg-[#34d399]/80 px-1.5 py-0.5 text-[6.5px] font-semibold text-[#062016]">
                  {t("backup.preview.vault")}
                </span>
              </div>

              <div className="overflow-visible rounded-md border border-white/8 bg-[#121416] p-1.5">
                <p className="text-[7px] font-semibold">{t("backup.preview.files")}</p>
                <span className="mt-1 inline-flex rounded bg-[#34d399] px-1.5 py-0.5 text-[6.5px] font-semibold text-[#062016]">
                  {t("backup.preview.upload")}
                </span>

                {/* Drop zone — drag file is anchored to this center */}
                <div className="relative mt-1.5 flex h-16 items-center justify-center overflow-visible rounded border border-dashed border-white/25 bg-[#0b0b0d]/70">
                  <span
                    className={cn(
                      styles?.dropGlow,
                      "pointer-events-none absolute inset-0 rounded bg-[#34d399]/18 ring-1 ring-[#34d399]/55"
                    )}
                  />
                  <span
                    className={cn(
                      styles?.dropHint,
                      "relative z-[1] px-1 text-center text-[6px] leading-snug text-white/40"
                    )}
                  >
                    {t("backup.preview.drop")}
                  </span>

                  {/* Dragging file: anchored to drop center, animates in from desktop */}
                  <div
                    className={cn(
                      styles?.dragFile,
                      "absolute top-1/2 left-1/2 z-30 flex w-12 flex-col items-center gap-0.5"
                    )}
                  >
                    <FileIcon />
                    <span className="max-w-full truncate text-center text-[6.5px] font-medium text-white shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                      {t("backup.preview.file")}
                    </span>
                  </div>

                  <div
                    className={cn(
                      styles?.dropped,
                      "absolute inset-0 z-[2] flex flex-col items-center justify-center gap-0.5"
                    )}
                  >
                    <FileIcon small />
                    <span className="max-w-[90%] truncate text-[6.5px] font-medium text-[#34d399]">
                      {t("backup.preview.file")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FileIcon({ small }: { small?: boolean }) {
  return (
    <svg
      width={small ? 16 : 22}
      height={small ? 18 : 26}
      viewBox="0 0 24 28"
      fill="none"
      className="drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]"
    >
      <path
        d="M4 2.5h10.5L20 8v17.5A1.5 1.5 0 0 1 18.5 27h-14A1.5 1.5 0 0 1 3 25.5v-21A2 2 0 0 1 4 2.5Z"
        fill="#e8e8ec"
        stroke="#c8c8d0"
      />
      <path d="M14.5 2.5V7A1.5 1.5 0 0 0 16 8.5h4.5" fill="#d0d0d8" stroke="#c8c8d0" />
      <path d="M7 14h10M7 17.5h8M7 21h6" stroke="#8b8b93" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
