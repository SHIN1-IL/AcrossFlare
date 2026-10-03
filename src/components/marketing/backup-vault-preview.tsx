"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import styles from "./backup-vault-preview.module.css";

const SAMPLE_EMAIL = "user@acrossflare.com";

/** Backup step 2: Vaultwarden login (email → password) → vault home. */
export function BackupVaultPreview() {
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
      className={cn(styles?.stage, "pointer-events-none mt-4 w-full max-w-[420px] select-none")}
    >
      <div className="relative aspect-[16/11] overflow-hidden rounded-xl border border-[#d8d8dc] bg-[#f0f0f2] text-[#1c1c1e] shadow-[0_16px_40px_rgba(0,0,0,0.14)]">
        <div className="flex h-5 items-center gap-1.5 border-b border-black/5 bg-white px-2.5">
          <span className="size-1.5 rounded-full bg-[#ff5f57]" />
          <span className="size-1.5 rounded-full bg-[#febc2e]" />
          <span className="size-1.5 rounded-full bg-[#28c840]" />
          <span className="ml-2 h-2.5 flex-1 rounded-sm bg-black/[0.04] px-1.5 text-[6px] leading-2.5 text-black/35">
            vault.acrossflare.com
          </span>
        </div>

        <div className="relative h-[calc(100%-1.25rem)]">
          {/* Login */}
          <div className={cn(styles?.login, "bg-[#f5f5f7]")}>
            <div className="flex items-center gap-1 px-3 pt-2">
              <VwMark className="size-3" />
              <span className="text-[8px] font-semibold">Vaultwarden</span>
            </div>

            <div className="relative mx-auto mt-3 w-[58%] max-w-[200px]">
              <div className="flex flex-col items-center">
                <VwMark className="size-8" />
                <p className="mt-1.5 text-[12px] font-semibold">{t("backup.preview.vw.login")}</p>
              </div>

              <div className="relative mt-2">
                <div className={cn(styles?.emailStep, "absolute inset-x-0 top-0")}>
                  <LoginCard>
                    <FieldLabel>{t("backup.preview.vw.email")}</FieldLabel>
                    <div className="relative mt-0.5 overflow-hidden rounded border-2 border-[#175ddc] bg-white px-1.5 py-1">
                      <span className="block truncate font-mono text-[8px] text-[#1c1c1e]">
                        {SAMPLE_EMAIL}
                      </span>
                      <span className={cn(styles?.emailMask, "absolute inset-0 bg-white")} />
                    </div>
                    <label className="mt-1.5 flex items-center gap-1 text-[7px] text-[#3a3a3c]">
                      <span className="size-2 rounded-[2px] border border-[#8b8b93]" />
                      {t("backup.preview.vw.remember")}
                    </label>
                    <span className="relative mt-2 flex h-6 items-center justify-center rounded-full bg-[#175ddc] text-[8px] font-semibold text-white">
                      {t("backup.preview.vw.continue")}
                      <span
                        className={cn(
                          styles?.continueRipple,
                          "pointer-events-none absolute top-1/2 left-1/2 size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-emerald-400 bg-emerald-400/30"
                        )}
                      />
                    </span>
                  </LoginCard>
                </div>

                <div className={cn(styles?.passStep, "absolute inset-x-0 top-0")}>
                  <LoginCard>
                    <p className="truncate text-[7px] text-[#6b6b70]">{SAMPLE_EMAIL}</p>
                    <FieldLabel>{t("backup.preview.vw.password")}</FieldLabel>
                    <div className="relative mt-0.5 overflow-hidden rounded border-2 border-[#175ddc] bg-white px-1.5 py-1">
                      <span className="block font-mono text-[9px] tracking-[0.18em] text-[#1c1c1e]">
                        ••••••••
                      </span>
                      <span className={cn(styles?.passMask, "absolute inset-0 bg-white")} />
                    </div>
                    <span className="relative mt-2 flex h-6 items-center justify-center rounded-full bg-[#175ddc] text-[8px] font-semibold text-white">
                      {t("backup.preview.vw.submit")}
                      <span
                        className={cn(
                          styles?.loginRipple,
                          "pointer-events-none absolute top-1/2 left-1/2 size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-emerald-400 bg-emerald-400/30"
                        )}
                      />
                    </span>
                  </LoginCard>
                </div>
              </div>

              <p className="absolute inset-x-0 -bottom-8 text-center text-[5.5px] text-black/35">
                Vaultwarden Web
              </p>
            </div>
          </div>

          {/* Vault home */}
          <div className={cn(styles?.vault, "flex bg-white")}>
            <aside className="flex w-[78px] shrink-0 flex-col bg-[#1f2124] px-1.5 py-2 text-white">
              <div className="mb-2 flex items-center gap-1">
                <VwMark className="size-3 invert" />
                <span className="truncate text-[6px] font-semibold leading-tight">
                  Vaultwarden
                </span>
              </div>
              {(
                [
                  [t("backup.preview.vw.navVault"), true],
                  ["Send", false],
                  [t("backup.preview.vw.navTools"), false],
                  [t("backup.preview.vw.navReports"), false],
                  [t("backup.preview.vw.navSettings"), false],
                ] as const
              ).map(([label, active]) => (
                <div
                  key={label}
                  className={cn(
                    "rounded px-1 py-1 text-[6.5px]",
                    active ? "bg-white/10 text-white" : "text-white/55"
                  )}
                >
                  {label}
                </div>
              ))}
            </aside>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between border-b border-black/5 px-2.5 py-1.5">
                <p className="text-[10px] font-semibold">{t("backup.preview.vw.allVaults")}</p>
                <div className="flex items-center gap-1.5">
                  <span className="rounded bg-[#175ddc] px-1.5 py-0.5 text-[7px] font-semibold text-white">
                    {t("backup.preview.vw.newItem")}
                  </span>
                  <span className="inline-flex size-4 items-center justify-center rounded-full bg-[#c4a574] text-[6px] font-bold text-white">
                    AF
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-[88px_1fr] gap-2 px-2 py-1.5">
                <div className="space-y-1 text-[6.5px] text-[#3a3a3c]">
                  <p className="font-semibold text-[#1c1c1e]">{t("backup.preview.vw.filter")}</p>
                  <div className="rounded border border-black/10 px-1 py-0.5 text-[#8b8b93]">
                    {t("backup.preview.vw.search")}
                  </div>
                  <p className="text-[#175ddc]">{t("backup.preview.vw.allVaults")}</p>
                  <p>{t("backup.preview.vw.myVault")}</p>
                  <p className="pt-1 text-[6px] font-semibold text-[#8b8b93]">
                    {t("backup.preview.vw.types")}
                  </p>
                  <p>{t("backup.preview.vw.logins")}</p>
                  <p>{t("backup.preview.vw.notes")}</p>
                </div>

                <div>
                  <div className="mb-1.5 rounded border border-[#d6e4ff] bg-[#f3f7ff] px-1.5 py-1">
                    <p className="text-[6.5px] font-semibold text-[#175ddc]">2/3 Complete</p>
                    <p className="mt-0.5 text-[6px] text-[#3a3a3c]">
                      {t("backup.preview.vw.getStarted")}
                    </p>
                  </div>
                  <div className="overflow-hidden rounded border border-black/8">
                    <div className="grid grid-cols-[1fr_48px] border-b border-black/8 bg-[#fafafa] px-1.5 py-1 text-[6.5px] font-semibold text-[#6b6b70]">
                      <span>{t("backup.preview.vw.name")}</span>
                      <span>{t("backup.preview.vw.owner")}</span>
                    </div>
                    <div className="grid grid-cols-[1fr_48px] items-center px-1.5 py-1.5 text-[7.5px]">
                      <span className="flex items-center gap-1 font-medium">
                        <span className="inline-flex size-3 items-center justify-center rounded bg-[#e8e8ec] text-[6px]">
                          ≡
                        </span>
                        {t("backup.preview.file")}
                      </span>
                      <span className="w-fit rounded-full bg-[#e8d9c0] px-1.5 py-0.5 text-[6px] font-semibold text-[#5c4630]">
                        {t("backup.preview.vw.me")}
                      </span>
                    </div>
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

function LoginCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-black/10 bg-white px-2.5 py-2 shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
      {children}
    </div>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <p className="text-[7px] font-medium text-[#3a3a3c]">{children}</p>;
}

function VwMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden>
      <circle cx="16" cy="16" r="15" stroke="currentColor" strokeWidth="2" />
      <path
        d="M10 12.5h12l-1.2 8.2c-.2 1.3-1.3 2.3-2.6 2.3h-4.4c-1.3 0-2.4-1-2.6-2.3L10 12.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M13 12.5V10a3 3 0 0 1 6 0v2.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
