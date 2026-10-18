"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { HeroGrain } from "@/components/marketing/hero-grain";
import { cn } from "@/lib/utils";

const VIDEO_SRC = "/marketing/acrossflare-hero.mp4";
const POSTER_SRC = "/marketing/acrossflare-hero-poster.png";

/** Soft green aurora — the signed-in first screen. */
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

function DarkGreenLanding({ className }: { className?: string }) {
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

export function SpiderWebLanding({
  className,
  signedIn = false,
}: {
  className?: string;
  /** Signed-in visitors get the dark green screen. Guests get the video hero. */
  signedIn?: boolean;
}) {
  if (signedIn) return <DarkGreenLanding className={className} />;
  return <HeroVideoLanding className={className} />;
}

function HeroVideoLanding({ className }: { className?: string }) {
  const t = useTranslations("heroDeck");
  const videoRef = useRef<HTMLVideoElement>(null);
  const frozenRef = useRef(false);
  const [frozen, setFrozen] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || reduced || failed) return;

    video.muted = true;
    video.defaultMuted = true;

    const play = () => {
      if (frozenRef.current || video.ended) return;
      void video.play().catch(() => {});
    };

    const onEnded = () => {
      video.pause();
      frozenRef.current = true;
      setFrozen(true);
    };

    video.addEventListener("ended", onEnded);
    video.addEventListener("loadeddata", play);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) play();
        else if (!video.ended) video.pause();
      },
      { threshold: 0.2 }
    );
    observer.observe(video);
    play();

    return () => {
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("loadeddata", play);
      observer.disconnect();
    };
  }, [reduced, failed]);

  function replay() {
    const video = videoRef.current;
    if (!video) return;
    frozenRef.current = false;
    setFrozen(false);

    const start = () => {
      void video.play().catch(() => {});
    };

    if (video.currentTime < 0.05) {
      start();
      return;
    }

    video.addEventListener("seeked", start, { once: true });
    video.currentTime = 0;
  }

  return (
    <section
      data-home-page
      className={cn(
        "relative -mt-14 h-dvh snap-center snap-always overflow-hidden bg-[#0e1014] max-md:snap-start",
        className
      )}
    >
      {failed ? (
        <img src={POSTER_SRC} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay={!reduced}
          muted
          playsInline
          preload={reduced ? "none" : "auto"}
          poster={POSTER_SRC}
          onError={() => setFailed(true)}
        >
          <source src={VIDEO_SRC} type="video/mp4" />
        </video>
      )}

      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-28 bg-[linear-gradient(to_bottom,rgba(14,16,20,0.72),transparent)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-40 bg-[linear-gradient(to_top,rgba(14,16,20,0.78),transparent)]"
        aria-hidden="true"
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-[22%] z-[4] flex justify-center px-6 text-center sm:bottom-[20%]">
        <h1 className="text-[clamp(2.25rem,7vw,3.75rem)] leading-[0.95] font-semibold tracking-[-0.04em] text-[#f4f4f5] drop-shadow-[0_2px_18px_rgba(0,0,0,0.65)]">
          AcrossFlare
        </h1>
      </div>

      {frozen && !failed ? (
        <button
          type="button"
          onClick={replay}
          className="absolute right-4 bottom-5 z-10 rounded-full border border-white/20 bg-black/55 px-3.5 py-1.5 text-sm text-white transition hover:bg-black/75"
        >
          {t("heroReplay")}
        </button>
      ) : null}
    </section>
  );
}
