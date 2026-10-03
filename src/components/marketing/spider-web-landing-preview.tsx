"use client";

import { cn } from "@/lib/utils";
import {
  SpiderWebAurora,
  SpiderWebStage,
} from "@/components/marketing/spider-web-landing";

/** Local `/dev/web-landing` harness around the production spider-web stage. */
export function SpiderWebLandingPreview({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      <p className="text-xs text-muted-foreground">대기 · 움직이면 거미줄 · 2초 정지 시 사라짐</p>
      <div className="relative h-[min(78dvh,560px)] w-full overflow-hidden bg-[#14181e]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(226,232,240,0.07),transparent_34%,rgba(0,0,0,0.2)),repeating-linear-gradient(90deg,rgba(255,255,255,0.045)_0px,rgba(255,255,255,0.045)_1px,transparent_1px,transparent_5px)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.1),transparent_55%)]" />
        <SpiderWebAurora />
        <SpiderWebStage className="absolute inset-0" />
      </div>
    </div>
  );
}
