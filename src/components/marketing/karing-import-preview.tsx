"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import styles from "./karing-import-preview.module.css";

const PREVIEW_URL = "https://sub.acrossflare.com/\u2026";

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
      className={cn(styles?.stage, "pointer-events-none mt-4 w-[220px] select-none")}
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
          <span className="text-[11px] font-semibold tracking-tight text-foreground">Karing</span>
        </div>
        <div className="relative px-3 pt-1 pb-3">
          <div
            className={cn(
              styles?.press,
              "flex h-7 items-center gap-2 rounded-md bg-primary/15 px-2 text-[10px] text-primary"
            )}
          >
            <span className="min-w-0 flex-1 truncate">{t("setup.preview.copy")}</span>
            <span className={cn(styles?.check, "shrink-0 text-[10px] leading-none")}>✓</span>
          </div>
          <div
            className={cn(
              styles?.toast,
              "absolute top-0 right-0 left-0 mx-auto w-fit rounded-full bg-foreground px-2 py-0.5 text-[9px] font-medium text-background"
            )}
          >
            {t("setup.preview.copied")}
          </div>
          <div className="relative mt-2 h-7 overflow-hidden rounded-md border border-border/80 bg-[#141824]">
            <span className="block truncate px-2 font-mono text-[9px] leading-7 text-foreground/90">
              {PREVIEW_URL}
            </span>
            <span className={cn(styles?.mask, "absolute inset-0 bg-[#141824]")} />
          </div>
          <div
            className={cn(
              styles?.node,
              "mt-2 flex h-9 items-center gap-1.5 rounded-md border border-border/70 px-2"
            )}
          >
            <span className="min-w-0 flex-1 truncate text-[10px] text-foreground">{t("setup.preview.node")}</span>
            <span className="shrink-0 text-[9px] text-muted-foreground">{t("setup.preview.latency")}</span>
            <span className="relative h-[18px] w-8 shrink-0 rounded-full bg-white/15">
              <span className={cn(styles?.track, "absolute inset-0 rounded-full bg-primary")} />
              <span
                className={cn(styles?.knob, "absolute top-[2px] left-[2px] size-[14px] rounded-full bg-white")}
              />
            </span>
          </div>
          <div className="mt-2 flex h-4 items-center">
            <span
              className={cn(
                styles?.badge,
                "rounded-full bg-primary/15 px-1.5 text-[8px] font-semibold tracking-wide text-primary"
              )}
            >
              {t("setup.preview.connected")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
