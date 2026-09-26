"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import styles from "./backup-open-preview.module.css";

export function BackupOpenPreview() {
  const t = useTranslations("support.backup.preview");
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
      { threshold: 0.4 }
    );
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={stageRef}
      aria-hidden="true"
      data-play={play ? "" : undefined}
      className={cn(styles.stage, "pointer-events-none mt-4 w-[220px] select-none")}
    >
      <div className="overflow-hidden rounded-[22px] border border-border bg-[#0c0e14]">
        <div className="flex items-center justify-between px-3 pt-2.5 text-[9px] leading-none text-muted-foreground">
          <span>9:41</span>
          <span className="relative h-[7px] w-[13px] rounded-[1.5px] border border-current">
            <span className="absolute inset-y-px left-px w-[8px] bg-current" />
            <span className="absolute top-[1.5px] -right-px h-[3px] w-px bg-current" />
          </span>
        </div>
        <div className="flex h-6 items-center gap-1.5 px-3">
          <span className="size-1.5 rounded-full bg-primary" />
          <span className="text-[11px] font-semibold tracking-tight text-foreground">Backup</span>
        </div>
        <div className="px-3 pt-1 pb-3">
          <div
            className={cn(
              styles.press,
              "flex h-7 items-center rounded-md bg-primary/15 px-2 text-[10px] text-primary"
            )}
          >
            <span className="min-w-0 flex-1 truncate">{t("vault")}</span>
          </div>
          <div className="mt-2 flex h-7 items-center rounded-md border border-border/80 px-2 text-[10px] text-foreground">
            <span className="min-w-0 flex-1 truncate">{t("files")}</span>
          </div>
          <div className="relative mt-2 h-9">
            <div
              className={cn(
                styles.vault,
                "absolute inset-0 flex items-center rounded-md border border-primary/30 bg-primary/10 px-2 text-[10px] text-primary"
              )}
            >
              <span className="truncate">{t("vaultName")}</span>
            </div>
            <div
              className={cn(
                styles.file,
                "absolute inset-0 flex items-center gap-1.5 rounded-md border border-border/70 px-2 text-[10px] text-foreground"
              )}
            >
              <span className="size-1.5 shrink-0 rounded-sm bg-primary" />
              <span className="min-w-0 flex-1 truncate">{t("file")}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
