"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { HeroGrain } from "@/components/marketing/hero-grain";
import { hasSignedInFlag, subscribeSession } from "@/lib/session";
import { cn } from "@/lib/utils";

const VIDEO_SRC = "https://af1-cje.pages.dev/hero_compressed.mp4";
const POSTER_SRC = "https://i.postimg.cc/vBk1MDP3/acrossicon-home-1792307899271.png";

/** Guest home ad plays through this time, then the dust hero returns. */
export const HERO_AD_SECONDS = 10;
/** Caption is on screen by this moment of the film. */
export const HERO_FREEZE_TIME = 5;
const HERO_IDLE_MS = 10_000;

/** Spoken lines on the clean hero film. Times match the old burned-in cues. */
export const HERO_CAPTION_CUES = [
  { id: "heroLine1", start: 0, end: 1.29 },
  { id: "heroLine2", start: 1.29, end: 3.04 },
  { id: "heroLine3", start: 4.42, end: Number.POSITIVE_INFINITY },
] as const;

export type HeroCaptionId = (typeof HERO_CAPTION_CUES)[number]["id"];

export function heroCaptionAt(time: number): HeroCaptionId | null {
  for (const cue of HERO_CAPTION_CUES) {
    if (time >= cue.start && time < cue.end) return cue.id;
  }
  return null;
}

/** How fast a mote closes on the viewer, in depth units per second. */
const DUST_APPROACH = 0.085;
/** Time for one mote to travel from far away to the viewer. */
const DUST_PASS = 0.9 / DUST_APPROACH;

type DustMote = {
  x: number;
  y: number;
  z: number;
  pace: number;
  cool: boolean;
  soft: boolean;
};

/** A mote ahead of the viewer. The field sits above the vanishing point. */
function spawnMote(far: boolean): DustMote {
  const angle = Math.random() * Math.PI * 2;
  const cluster = Math.random() < 0.74;
  const radius = cluster ? Math.pow(Math.random(), 0.5) * 0.9 : 0.4 + Math.random() * 0.85;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius * 0.72 - (cluster ? 0.28 : 0.06),
    z: far ? 0.78 + Math.random() * 0.22 : 0.16 + Math.random() * 0.84,
    pace: 0.72 + Math.random() * 0.5,
    cool: Math.random() > 0.8,
    soft: Math.random() > 0.84,
  };
}

/** Cosmic dust coming straight at the viewer, denser in the upper field. */
function LandingDust() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const motes = Array.from({ length: 220 }, () => spawnMote(false));
    let frame = 0;
    let last = performance.now();

    const paint = (now: number) => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width < 2 || height < 2) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const pixelWidth = Math.floor(width * dpr);
      const pixelHeight = Math.floor(height * dpr);
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);

      const originX = width * 0.5;
      const originY = height * 0.46;
      const reach = Math.min(width, height) * 0.62;
      const moving = !reduced.matches;

      for (const mote of motes) {
        if (moving) {
          mote.z -= dt * DUST_APPROACH * mote.pace;
          if (mote.z < 0.1) {
            const next = spawnMote(true);
            mote.x = next.x;
            mote.y = next.y;
            mote.z = next.z;
            mote.pace = next.pace;
            mote.cool = next.cool;
            mote.soft = next.soft;
          }
        }

        const near = 1 - mote.z;
        const depth = 1 / mote.z;
        const x = originX + mote.x * depth * reach;
        const y = originY + mote.y * depth * reach;
        if (x < -24 || y < -24 || x > width + 24 || y > height * 0.78) continue;

        const titleX = (x - width * 0.5) / (width * 0.24);
        const titleY = (y - height * 0.48) / (height * 0.12);
        const titleDistance = Math.hypot(titleX, titleY);
        const titleFade = titleDistance < 1 ? titleDistance * titleDistance : 1;
        const floorFade =
          y > height * 0.58 ? Math.max(0, 1 - (y - height * 0.58) / (height * 0.14)) : 1;
        const alpha = (0.12 + near * 0.72) * titleFade * floorFade;
        if (alpha < 0.02) continue;

        const radius = (mote.soft ? 0.7 : 0.35) + near * (mote.soft ? 2.4 : 1.5);
        const color = mote.cool ? "206,226,216" : "246,247,244";
        context.fillStyle = `rgba(${color},${alpha})`;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
      }
    };

    const tick = (now: number) => {
      paint(now);
      frame = requestAnimationFrame(tick);
    };

    if (reduced.matches) {
      paint(performance.now());
      const observer = new ResizeObserver(() => paint(performance.now()));
      observer.observe(canvas);
      return () => observer.disconnect();
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}

const WORDMARK = "AcrossFlare";
const WORDMARK_SUB = "Secure Cloud & Network Optimization";

/** Soft green gas drifting around the wordmark. */
function LandingGas() {
  return (
    <div aria-hidden className="af-gas">
      <span className="af-gas-layer af-gas-wide" />
      <span className="af-gas-layer af-gas-high" />
      <span className="af-gas-layer af-gas-low" />
      <style>{`
        .af-gas {
          position: absolute;
          left: 50%;
          top: 46%;
          width: 168%;
          height: 260%;
          transform: translate(-50%, -50%);
          pointer-events: none;
          filter: blur(26px);
        }
        .af-gas-layer {
          position: absolute;
          border-radius: 50%;
        }
        .af-gas-wide {
          left: 4%;
          top: 28%;
          width: 92%;
          height: 46%;
          transform-origin: 42% 58%;
          background: radial-gradient(ellipse at 50% 50%, rgba(16,185,129,0.28), rgba(52,211,153,0.1) 46%, transparent 72%);
          animation: af-gas-wide ${DUST_PASS.toFixed(2)}s ease-in-out infinite;
        }
        .af-gas-high {
          left: 18%;
          top: 8%;
          width: 64%;
          height: 42%;
          transform-origin: 62% 36%;
          background: radial-gradient(ellipse at 46% 60%, rgba(110,231,183,0.22), transparent 68%);
          animation: af-gas-high ${(DUST_PASS / 1.18).toFixed(2)}s ease-in-out infinite;
        }
        .af-gas-low {
          left: 22%;
          bottom: 6%;
          width: 56%;
          height: 34%;
          transform-origin: 36% 64%;
          background: radial-gradient(ellipse at 50% 40%, rgba(45,212,191,0.16), transparent 70%);
          animation: af-gas-low ${(DUST_PASS / 0.82).toFixed(2)}s ease-in-out infinite;
        }
        @keyframes af-gas-wide {
          0% { opacity: 0.95; transform: translate3d(-2%, 1%, 0) scale(0.82); }
          28% { opacity: 0.62; transform: translate3d(3%, -1%, 0) scale(1.22); }
          47% { opacity: 0.78; transform: translate3d(1%, 2%, 0) scale(1.04); }
          71% { opacity: 0.55; transform: translate3d(-3%, 0, 0) scale(1.28); }
          100% { opacity: 0.95; transform: translate3d(-2%, 1%, 0) scale(0.82); }
        }
        @keyframes af-gas-high {
          0% { opacity: 0.58; transform: translate3d(2%, -2%, 0) scale(1.18); }
          36% { opacity: 0.92; transform: translate3d(-4%, 3%, 0) scale(0.74); }
          63% { opacity: 0.66; transform: translate3d(3%, 1%, 0) scale(1.12); }
          100% { opacity: 0.58; transform: translate3d(2%, -2%, 0) scale(1.18); }
        }
        @keyframes af-gas-low {
          0% { opacity: 0.84; transform: translate3d(1%, 3%, 0) scale(0.8); }
          41% { opacity: 0.5; transform: translate3d(-3%, -2%, 0) scale(1.24); }
          68% { opacity: 0.76; transform: translate3d(2%, 1%, 0) scale(0.9); }
          100% { opacity: 0.84; transform: translate3d(1%, 3%, 0) scale(0.8); }
        }
        @media (prefers-reduced-motion: reduce) {
          .af-gas-layer { animation: none; }
        }
      `}</style>
    </div>
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
      <LandingDust />
      <HeroGrain />
      <div className="pointer-events-none absolute inset-0 z-[4] flex items-center justify-center">
        <div className="relative text-center">
          <LandingGas />
          <h1 className="relative text-[clamp(2.5rem,9vw,4.5rem)] leading-[0.95] font-semibold tracking-[-0.04em] text-[#f4f4f5]">
            {WORDMARK}
          </h1>
          <p className="relative mt-4 text-[clamp(0.75rem,2vw,1.125rem)] leading-normal whitespace-nowrap text-[#888888]">
            {WORDMARK_SUB}
          </p>
        </div>
      </div>
    </section>
  );
}

function useSignedInHero() {
  return useSyncExternalStore(subscribeSession, hasSignedInFlag, () => false);
}

export function SpiderWebLanding({ className }: { className?: string }) {
  const signedIn = useSignedInHero();
  if (signedIn) return <DarkGreenLanding className={className} />;
  return <GuestHomeHero className={className} />;
}

/** Home only: play the film, rest on the signed-in hero, replay after an idle pause. */
function GuestHomeHero({ className }: { className?: string }) {
  const [reduced, setReduced] = useState(false);
  const [showingAd, setShowingAd] = useState(true);
  const [adRun, setAdRun] = useState(0);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (showingAd || reduced) return;
    const section = document.querySelector("[data-home-page]");
    if (!(section instanceof HTMLElement)) return;

    let visible = true;
    let timer = 0;
    const clear = () => window.clearTimeout(timer);
    const arm = () => {
      clear();
      if (!visible) return;
      timer = window.setTimeout(() => {
        setAdRun((run) => run + 1);
        setShowingAd(true);
      }, HERO_IDLE_MS);
    };
    const onActivity = () => {
      if (visible) arm();
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.55);
        arm();
      },
      { threshold: [0, 0.55, 0.75] }
    );
    observer.observe(section);
    window.addEventListener("pointerdown", onActivity);
    window.addEventListener("keydown", onActivity);
    window.addEventListener("wheel", onActivity, { passive: true });
    window.addEventListener("touchstart", onActivity, { passive: true });
    document.addEventListener("scroll", onActivity, true);
    arm();

    return () => {
      clear();
      observer.disconnect();
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("wheel", onActivity);
      window.removeEventListener("touchstart", onActivity);
      document.removeEventListener("scroll", onActivity, true);
    };
  }, [showingAd, reduced]);

  if (reduced || !showingAd) return <DarkGreenLanding className={className} />;
  return <HeroVideoLanding key={adRun} className={className} onFinished={() => setShowingAd(false)} />;
}

function HeroVideoLanding({
  className,
  onFinished,
}: {
  className?: string;
  onFinished?: () => void;
}) {
  const t = useTranslations("heroDeck");
  const videoRef = useRef<HTMLVideoElement>(null);
  const frozenRef = useRef(false);
  const finishedRef = useRef(false);
  const restartingRef = useRef(false);
  const onFinishedRef = useRef(onFinished);
  const [frozen, setFrozen] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [failed, setFailed] = useState(false);
  const [captionId, setCaptionId] = useState<HeroCaptionId | null>(null);

  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

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

    let frame = 0;

    const syncCaption = () => {
      const next = heroCaptionAt(video.currentTime);
      setCaptionId((current) => (current === next ? current : next));
    };

    const finish = () => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      video.pause();
      onFinishedRef.current?.();
    };

    const tick = () => {
      if (restartingRef.current || finishedRef.current) return;
      if (onFinishedRef.current) {
        if (video.currentTime >= HERO_AD_SECONDS) finish();
      } else if (video.currentTime >= HERO_FREEZE_TIME && !frozenRef.current) {
        video.pause();
        frozenRef.current = true;
        setFrozen(true);
      }
      syncCaption();
    };

    const watchFrames = () => {
      tick();
      if (frozenRef.current || video.paused) return;
      if (typeof video.requestVideoFrameCallback === "function") {
        frame = video.requestVideoFrameCallback(watchFrames);
      }
    };

    const play = () => {
      if (finishedRef.current || frozenRef.current || video.ended) return;
      void video.play().catch(() => {});
    };

    const onEnded = () => {
      syncCaption();
      if (onFinishedRef.current) {
        finish();
        return;
      }
      video.pause();
      frozenRef.current = true;
      setFrozen(true);
    };

    video.addEventListener("ended", onEnded);
    video.addEventListener("timeupdate", tick);
    video.addEventListener("play", watchFrames);
    video.addEventListener("loadeddata", play);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) play();
        else if (!frozenRef.current && !video.ended) video.pause();
      },
      { threshold: 0.2 }
    );
    observer.observe(video);
    play();

    return () => {
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("timeupdate", tick);
      video.removeEventListener("play", watchFrames);
      video.removeEventListener("loadeddata", play);
      if (frame && typeof video.cancelVideoFrameCallback === "function") {
        video.cancelVideoFrameCallback(frame);
      }
      observer.disconnect();
    };
  }, [reduced, failed]);

  function replay() {
    const video = videoRef.current;
    if (!video) return;
    restartingRef.current = true;
    frozenRef.current = false;
    setFrozen(false);
    setCaptionId(heroCaptionAt(0));

    const start = () => {
      restartingRef.current = false;
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
          autoPlay
          muted
          playsInline
          preload="auto"
          poster={POSTER_SRC}
          onError={() => {
            setFailed(true);
            onFinished?.();
          }}
          webkit-playsinline=""
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

      {frozen && !failed ? (
        <div
          aria-hidden
          onClick={replay}
          title={t("heroReplayHint")}
          className="absolute inset-0 z-[3] cursor-pointer touch-pan-y"
        />
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 bottom-[22%] z-[4] flex justify-center px-6 text-center sm:bottom-[20%]">
        <h1
          className="text-[clamp(2.25rem,7vw,3.75rem)] leading-none font-semibold tracking-[-0.03em] text-[#6ee7b7]"
          style={{ textShadow: "0 1px 2px rgba(0, 0, 0, 0.55)" }}
        >
          AcrossFlare
        </h1>
      </div>

      {captionId && !failed ? (
        <p
          aria-live="polite"
          className="pointer-events-none absolute inset-x-0 z-[4] px-16 text-center leading-[0.95] font-bold tracking-[-0.04em] text-white"
          style={{
            bottom: "8%",
            fontSize: "clamp(1.45rem, 4vw, 2.2rem)",
            textShadow:
              "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 8px rgba(0,0,0,0.8)",
          }}
        >
          {t(captionId)}
        </p>
      ) : null}

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
