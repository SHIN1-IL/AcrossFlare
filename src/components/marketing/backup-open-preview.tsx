"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import styles from "./backup-open-preview.module.css";

/** Backup step 1: Console → click 백업 → Backup page → click 금고 열기. */
export function BackupOpenPreview() {
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

  const nav = [
    { id: "overview", label: t("backup.preview.overview"), activeOnConsole: true },
    { id: "backup", label: t("backup.preview.nav"), activeOnBackup: true },
    { id: "standard", label: "Standard" },
    { id: "workspace", label: "Workspace" },
    { id: "billing", label: t("backup.preview.billing") },
    { id: "settings", label: t("backup.preview.settings") },
  ] as const;

  return (
    <div
      ref={stageRef}
      aria-hidden="true"
      data-play={play ? "" : undefined}
      className={cn(styles?.stage, "pointer-events-none mt-4 w-full max-w-[420px] select-none")}
    >
      <div className="relative aspect-[16/11] overflow-hidden rounded-xl border border-[#2a2a2e] bg-[#0b0b0d] text-white shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
        {/* Chrome-ish top bar */}
        <div className="flex h-5 items-center gap-1.5 border-b border-white/5 bg-[#141416] px-2.5">
          <span className="size-1.5 rounded-full bg-[#ff5f57]" />
          <span className="size-1.5 rounded-full bg-[#febc2e]" />
          <span className="size-1.5 rounded-full bg-[#28c840]" />
          <span className="ml-2 h-2.5 flex-1 rounded-sm bg-white/5 px-1.5 text-[6px] leading-2.5 text-white/35">
            acrossflare.com/console
          </span>
        </div>

        <div className="relative h-[calc(100%-1.25rem)]">
          {/* Console overview */}
          <div className={cn(styles?.console, "flex")}>
            <Sidebar
              nav={nav}
              mode="console"
              navRippleClass={styles?.navRipple}
              navActiveClass={styles?.navActive}
            />
            <div className="min-w-0 flex-1 px-3 py-2.5">
              <p className="text-[7px] font-semibold tracking-[0.14em] text-[#34d399]">ACROSSFLARE</p>
              <h3 className="mt-0.5 text-[13px] font-semibold tracking-tight">
                {t("backup.preview.console")}
              </h3>
              <p className="mt-0.5 text-[7px] leading-snug text-white/45">
                {t("backup.preview.consoleSub")}
              </p>
              <div className="mt-2.5 rounded-lg border border-[#34d399]/45 bg-[#101214] p-2.5">
                <span className="inline-flex rounded-full border border-[#34d399]/70 px-1.5 py-0.5 text-[7px] text-[#34d399]">
                  {t("backup.preview.active")}
                </span>
                <p className="mt-1.5 text-[12px] font-semibold">Standard</p>
                <p className="mt-0.5 text-[7px] leading-snug text-white/50">
                  {t("backup.preview.planDesc")}
                </p>
                <span className="mt-2 inline-flex rounded-md bg-[#34d399] px-2 py-1 text-[8px] font-semibold text-[#062016]">
                  {t("backup.preview.open")}
                </span>
              </div>
            </div>
          </div>

          {/* Backup page */}
          <div className={cn(styles?.backup, "flex")}>
            <Sidebar
              nav={nav}
              mode="backup"
              navRippleClass={styles?.navRipple}
              navActiveClass={styles?.navActive}
            />
            <div className="min-w-0 flex-1 overflow-hidden px-2.5 py-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-[11px] font-semibold tracking-tight">
                    {t("backup.preview.backupTitle")}
                  </h3>
                  <p className="mt-0.5 line-clamp-2 text-[6.5px] leading-snug text-white/45">
                    {t("backup.preview.backupDesc")}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-[#34d399]/70 px-1.5 py-0.5 text-[6.5px] text-[#34d399]">
                  {t("backup.preview.active")}
                </span>
              </div>

              <div className="mt-1.5 rounded-md border border-white/8 bg-[#121416] px-2 py-1.5">
                <div className="flex items-center justify-between text-[7px]">
                  <span className="text-white/70">{t("backup.preview.usage")}</span>
                  <span className="text-white/45">0 / 1 GB</span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-[3%] rounded-full bg-[#34d399]" />
                </div>
              </div>

              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                <div className="rounded-md border border-white/8 bg-[#121416] p-1.5">
                  <p className="text-[7.5px] font-semibold">{t("backup.preview.vaultName")}</p>
                  <p className="mt-0.5 line-clamp-2 text-[6px] leading-snug text-white/40">
                    {t("backup.preview.vaultDesc")}
                  </p>
                  <div className="mt-1 space-y-0.5">
                    <FakeField label="Vault URL" value="https://vault.acrossflare.com" />
                    <FakeField label="Vault User" value="user@acrossflare.com" />
                  </div>
                  <span className="relative mt-1.5 inline-flex rounded-md bg-[#34d399] px-2 py-1 text-[7.5px] font-semibold text-[#062016]">
                    {t("backup.preview.vault")}
                    <span
                      className={cn(
                        styles?.vaultRipple,
                        "pointer-events-none absolute top-1/2 left-1/2 size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-emerald-400 bg-emerald-400/30"
                      )}
                    />
                  </span>
                </div>
                <div className="rounded-md border border-white/8 bg-[#121416] p-1.5">
                  <p className="text-[7.5px] font-semibold">{t("backup.preview.files")}</p>
                  <p className="mt-0.5 line-clamp-2 text-[6px] leading-snug text-white/40">
                    {t("backup.preview.filesDesc")}
                  </p>
                  <span className="mt-1.5 inline-flex rounded-md bg-[#34d399] px-2 py-1 text-[7px] font-semibold text-[#062016]">
                    {t("backup.preview.upload")}
                  </span>
                  <div className="mt-1.5 flex h-10 items-center justify-center rounded border border-dashed border-white/15 text-[6px] text-white/35">
                    {t("backup.preview.drop")}
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

function Sidebar({
  nav,
  mode,
  navRippleClass,
  navActiveClass,
}: {
  nav: readonly {
    id: string;
    label: string;
    activeOnConsole?: boolean;
    activeOnBackup?: boolean;
  }[];
  mode: "console" | "backup";
  navRippleClass?: string;
  navActiveClass?: string;
}) {
  return (
    <aside className="flex w-[72px] shrink-0 flex-col gap-0.5 border-r border-white/5 bg-[#0e0e10] px-1.5 py-2">
      <div className="mb-1.5 flex items-center gap-1 px-0.5">
        <span className="inline-flex size-3.5 items-center justify-center rounded-[4px] bg-[#34d399] text-[6px] font-bold text-[#062016]">
          Af
        </span>
        <span className="truncate text-[6.5px] font-semibold text-white/85">AcrossFlare</span>
      </div>
      {nav.map((item) => {
        const isBackup = item.id === "backup";
        const active =
          mode === "console" ? Boolean(item.activeOnConsole) : Boolean(item.activeOnBackup);
        return (
          <div
            key={item.id}
            className={cn(
              "relative rounded-md px-1.5 py-1 text-[7px]",
              active ? "bg-[#34d399]/15 text-[#34d399]" : "text-white/55"
            )}
          >
            {item.label}
            {isBackup && mode === "console" ? (
              <>
                <span
                  className={cn(
                    navActiveClass,
                    "pointer-events-none absolute inset-0 rounded-md bg-[#34d399]/15"
                  )}
                />
                <span
                  className={cn(
                    navRippleClass,
                    "pointer-events-none absolute top-1/2 left-1/2 size-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-emerald-400 bg-emerald-400/30"
                  )}
                />
              </>
            ) : null}
          </div>
        );
      })}
    </aside>
  );
}

function FakeField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 bg-[#0b0b0d] px-1 py-0.5">
      <p className="text-[5.5px] text-white/35">{label}</p>
      <p className="truncate text-[6px] text-white/70">{value}</p>
    </div>
  );
}
