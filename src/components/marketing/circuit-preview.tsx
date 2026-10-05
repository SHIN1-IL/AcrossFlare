"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

const DEFAULT_SRC = "/marketing/circuit-preview-1920.jpg";

type CircuitPreviewProps = {
  imageSrc?: string;
  chipLabel?: string;
  className?: string;
};

/** Local preview of the page-1 planar motherboard with emerald LED indicators. */
export function CircuitPreview({
  imageSrc = DEFAULT_SRC,
  chipLabel = "AcrossFlare Engine",
  className,
}: CircuitPreviewProps) {
  return (
    <section className={cn("flex w-full justify-center bg-black px-4 py-12", className)}>
      <div className="group relative w-full max-w-5xl rounded-2xl border border-neutral-800/90 bg-neutral-950 p-2.5 shadow-2xl shadow-black transition-all duration-500 hover:border-neutral-700">
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
          <Image
            src={imageSrc}
            alt="AcrossFlare Planar Circuit Board"
            fill
            priority
            sizes="(max-width: 1920px) 100vw, 1920px"
            quality={97}
            className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.015]"
            style={{ filter: "brightness(0.84) contrast(0.94) saturate(0.55)" }}
          />

          <div className="pointer-events-none absolute inset-0 bg-[#0a0c10]/18 mix-blend-multiply" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-neutral-950/75 via-transparent to-neutral-950/22" />
          <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10" />

          <CircuitLedLayer />

          <div className="absolute bottom-4 left-4 flex items-center gap-2.5 rounded-full border border-neutral-800/80 bg-neutral-950/85 px-3.5 py-1.5 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
            </span>
            <span className="font-mono text-xs font-medium tracking-wider text-neutral-300 uppercase">
              {chipLabel} · ONLINE
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Emerald activity LEDs for the dense board (chip / cooler / keydeck). */
export function CircuitLedLayer({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0", className)}>
      {/* AcrossFlare core chip */}
      <div className="absolute top-[30%] left-[28%]">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-80" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
        </span>
      </div>

      {/* Secondary processor / bus */}
      <div className="absolute top-[48%] left-[40%]">
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
      </div>

      {/* Cooling fan / vapor chamber zone */}
      <div className="absolute top-[34%] right-[16%]">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-60 [animation-duration:2.4s]" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
        </span>
      </div>

      {/* Heatsink fin bank */}
      <div className="absolute top-[22%] right-[34%]">
        <span className="inline-block h-1 w-1 animate-ping rounded-full bg-emerald-500/90 shadow-[0_0_6px_#10b981] [animation-duration:3s]" />
      </div>

      {/* Bottom keydeck / control module */}
      <div className="absolute bottom-[16%] left-[46%]">
        <span className="inline-block h-1 w-1 animate-ping rounded-full bg-emerald-400/90 shadow-[0_0_6px_#34d399] [animation-duration:2.8s]" />
      </div>
    </div>
  );
}
