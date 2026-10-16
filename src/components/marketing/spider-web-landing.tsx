"use client";

import { HeroGrain } from "@/components/marketing/hero-grain";
import { cn } from "@/lib/utils";

/** Soft green aurora — top-right. */
function LandingAurora() {
  return (
    <>
      <div
        className="pointer-events-none absolute -top-[12%] -right-[8%] z-[1] h-[58%] w-[52%]"
        style={{
          background:
            "radial-gradient(ellipse 72% 58% at 70% 32%, rgba(52,211,153,0.22) 0%, rgba(16,185,129,0.1) 38%, transparent 72%)",
          filter: "blur(32px)",
          animation: "af-landing-aurora 12s ease-in-out infinite",
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-[2%] right-[4%] z-[1] h-[26%] w-[28%]"
        style={{
          background:
            "radial-gradient(ellipse 55% 48% at 62% 38%, rgba(167,243,208,0.16) 0%, rgba(52,211,153,0.07) 48%, transparent 74%)",
          filter: "blur(20px)",
          animation: "af-landing-aurora 16s ease-in-out infinite reverse",
        }}
        aria-hidden="true"
      />
      <style>{`
        @keyframes af-landing-aurora {
          0%, 100% { opacity: 0.14; transform: translate3d(0, 0, 0) scale(1); }
          50% { opacity: 0.28; transform: translate3d(-1%, 0.8%, 0) scale(1.025); }
        }
      `}</style>
    </>
  );
}

export function SpiderWebLanding({ className }: { className?: string }) {
  return (
    <section
      data-home-page
      className={cn(
        "relative -mt-14 h-dvh snap-center snap-always overflow-hidden bg-[#0e1014] max-md:snap-start",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(226,232,240,0.05),transparent_34%,rgba(0,0,0,0.28)),repeating-linear-gradient(90deg,rgba(255,255,255,0.03)_0px,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_5px)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.07),transparent_55%)]" />
      <LandingAurora />
      <HeroGrain />
      <div className="pointer-events-none absolute inset-0 z-[4] flex flex-col items-center justify-center text-center">
        <h1 className="text-[clamp(2.5rem,9vw,4.5rem)] leading-[0.95] font-semibold tracking-[-0.04em] text-[#f4f4f5]">
          AcrossFlare
        </h1>
        <p className="mt-4 text-[clamp(0.75rem,2vw,1.125rem)] whitespace-nowrap text-[#888888]">
          Secure Cloud & Network Optimization
        </p>
      </div>
    </section>
  );
}
