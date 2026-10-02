"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { HeroGrain } from "@/components/marketing/hero-grain";

const IDLE_HIDE_MS = 2000;
const SETTLE_MS = 3000;
const WEB_SRC = "/marketing/semiconductor-web.jpg";
const SPARK_GAP_MS = 32;

type Aim = { x: number; y: number };
type Spark = {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  size: number;
  life: number;
};

export function SpiderWebLanding({ className }: { className?: string }) {
  return (
    <section
      data-home-page
      className={cn(
        "relative -mt-14 h-dvh snap-center snap-always overflow-hidden bg-[#14181e] max-md:snap-start",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(226,232,240,0.07),transparent_34%,rgba(0,0,0,0.2)),repeating-linear-gradient(90deg,rgba(255,255,255,0.045)_0px,rgba(255,255,255,0.045)_1px,transparent_1px,transparent_5px)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.1),transparent_55%)]" />
      <HeroGrain />
      <SpiderWebStage className="absolute inset-0" />
    </section>
  );
}

export function SpiderWebStage({ className }: { className?: string }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const idleTimer = useRef<number | null>(null);
  const settleStartedAt = useRef(0);
  const visibleRef = useRef(false);
  const activeRef = useRef(false);
  const raf = useRef(0);
  const sparkId = useRef(0);
  const lastSparkAt = useRef(0);
  const [visible, setVisible] = useState(false);
  const [settling, setSettling] = useState(false);
  const [aim, setAim] = useState<Aim>({ x: 0, y: 0 });
  const [motion, setMotion] = useState({ x: 0, y: 0, rot: 0, scale: 1 });
  const [sparks, setSparks] = useState<Spark[]>([]);

  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  useEffect(() => {
    return () => {
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
      if (raf.current) window.cancelAnimationFrame(raf.current);
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      setMotion({ x: 0, y: 0, rot: 0, scale: 1 });
      return;
    }

    const tick = (now: number) => {
      const settleElapsed = now - settleStartedAt.current;
      const settleT = settling ? Math.min(1, settleElapsed / SETTLE_MS) : 1;
      const settleAmp = settling ? (1 - settleT) * (1 - settleT) : 0;
      const liveAmp = activeRef.current ? 0.1 : 0;
      const amp = Math.max(settleAmp * 0.55, liveAmp);
      const wave = now / 48;
      setMotion({
        x: Math.sin(wave * 2.0) * 2.4 * amp + Math.sin(wave * 0.7) * 1.0 * amp,
        y: Math.cos(wave * 1.7) * 2.0 * amp + Math.cos(wave * 0.55) * 0.8 * amp,
        rot: Math.sin(wave * 1.4) * 0.7 * amp,
        scale: 1 + Math.sin(wave * 2.2) * 0.006 * amp,
      });
      if (settling && settleT >= 1) {
        setSettling(false);
      }
      raf.current = window.requestAnimationFrame(tick);
    };

    raf.current = window.requestAnimationFrame(tick);
    return () => {
      if (raf.current) window.cancelAnimationFrame(raf.current);
    };
  }, [visible, settling]);

  function clearIdle() {
    if (idleTimer.current) {
      window.clearTimeout(idleTimer.current);
      idleTimer.current = null;
    }
  }

  function armIdleHide() {
    clearIdle();
    activeRef.current = false;
    idleTimer.current = window.setTimeout(() => {
      visibleRef.current = false;
      setVisible(false);
      setSettling(false);
      setMotion({ x: 0, y: 0, rot: 0, scale: 1 });
      setSparks([]);
    }, IDLE_HIDE_MS);
  }

  function emitSparks(xPct: number, yPct: number, burst = false) {
    const now = performance.now();
    if (!burst && now - lastSparkAt.current < SPARK_GAP_MS) return;
    lastSparkAt.current = now;
    const count = burst ? 11 : 4 + Math.floor(Math.random() * 3);
    const next: Spark[] = [];
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const dist = (burst ? 20 : 12) + Math.random() * (burst ? 38 : 26);
      next.push({
        id: sparkId.current++,
        x: xPct + (Math.random() - 0.5) * 1.8,
        y: yPct + (Math.random() - 0.5) * 1.8,
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist,
        size: 2 + Math.random() * 3.2,
        life: 320 + Math.random() * 280,
      });
    }
    setSparks((prev) => [...prev.slice(-40), ...next]);
  }

  function revealWeb(xPct: number, yPct: number) {
    activeRef.current = true;
    if (!visibleRef.current) {
      visibleRef.current = true;
      settleStartedAt.current = performance.now();
      setVisible(true);
      setSettling(true);
      emitSparks(xPct, yPct, true);
      return;
    }
    setVisible(true);
    emitSparks(xPct, yPct);
  }

  function pointFromEvent(clientX: number, clientY: number) {
    const box = stageRef.current?.getBoundingClientRect();
    if (!box || box.width === 0 || box.height === 0) {
      return null;
    }
    const next = {
      x: (clientX - box.left) / box.width - 0.5,
      y: (clientY - box.top) / box.height - 0.5,
    };
    setAim(next);
    return next;
  }

  function onPointerActivity(clientX: number, clientY: number) {
    const next = pointFromEvent(clientX, clientY);
    if (!next) return;
    const xPct = (next.x + 0.5) * 100;
    const yPct = (next.y + 0.5) * 100;
    revealWeb(xPct, yPct);
    activeRef.current = true;
    clearIdle();
    idleTimer.current = window.setTimeout(() => {
      activeRef.current = false;
      idleTimer.current = window.setTimeout(() => {
        visibleRef.current = false;
        setVisible(false);
        setSettling(false);
        setMotion({ x: 0, y: 0, rot: 0, scale: 1 });
        setSparks([]);
      }, IDLE_HIDE_MS);
    }, 140);
  }

  const originX = 50;
  const originY = 46;
  const followX = aim.x * 24;
  const followY = aim.y * 18;
  const tiltY = aim.x * 14;
  const tiltX = -aim.y * 10;

  return (
    <div
      ref={stageRef}
      className={cn("select-none", className)}
      style={{ perspective: "1400px", touchAction: "pan-y" }}
      onPointerMove={(event) => onPointerActivity(event.clientX, event.clientY)}
      onPointerDown={(event) => {
        onPointerActivity(event.clientX, event.clientY);
      }}
      onPointerUp={armIdleHide}
      onPointerCancel={armIdleHide}
      onPointerLeave={(event) => {
        if (event.pointerType !== "touch") armIdleHide();
      }}
    >
      <style>{`
        @keyframes af-web-spark {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.15);
          }
          100% {
            opacity: 0;
            transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(0.12);
          }
        }
      `}</style>

      {/* Keep existing bg + texture; only darken slightly when web appears */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-[1] bg-black/[0.07] transition-opacity duration-500",
          visible ? "opacity-100" : "opacity-0"
        )}
        aria-hidden="true"
      />

      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-[2] transition-opacity duration-500",
          visible ? "opacity-100" : "opacity-0"
        )}
        style={{
          transformStyle: "preserve-3d",
          transform: `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
        }}
        aria-hidden="true"
      >
        <div
          className="absolute"
          style={{
            inset: "-6%",
            width: "112%",
            height: "112%",
            transform: `translate3d(${followX + motion.x}px, ${followY + motion.y}px, 24px) rotate(${motion.rot}deg) scale(${motion.scale})`,
            transformOrigin: `${originX}% ${originY}%`,
            willChange: "transform",
            maskImage: "radial-gradient(ellipse 72% 68% at 50% 46%, #000 42%, transparent 88%)",
            WebkitMaskImage: "radial-gradient(ellipse 72% 68% at 50% 46%, #000 42%, transparent 88%)",
          }}
        >
          <img
            src={`${WEB_SRC}?v=2`}
            alt=""
            draggable={false}
            className="absolute inset-0 size-full object-cover"
            style={{
              opacity: 0.3,
              filter: "contrast(1.06) brightness(1.04) saturate(1.05)",
              mixBlendMode: "lighten",
            }}
          />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 z-[5]" aria-hidden="true">
        {sparks.map((spark) => (
          <span
            key={spark.id}
            className="absolute rounded-full"
            style={{
              left: `${spark.x}%`,
              top: `${spark.y}%`,
              width: spark.size,
              height: spark.size,
              background: "radial-gradient(circle, #ffffff 0%, #a7f3d0 40%, #34d399 75%, #10b981 100%)",
              boxShadow: "0 0 8px rgba(167,243,208,0.95), 0 0 16px rgba(52,211,153,0.7), 0 0 28px rgba(16,185,129,0.45)",
              ["--dx" as string]: `${spark.dx}px`,
              ["--dy" as string]: `${spark.dy}px`,
              animation: `af-web-spark ${spark.life}ms ease-out forwards`,
            }}
            onAnimationEnd={() => {
              setSparks((prev) => prev.filter((item) => item.id !== spark.id));
            }}
          />
        ))}
      </div>

      <div className="pointer-events-none absolute inset-0 z-[4] flex flex-col items-center justify-center text-center">
        <h1 className="text-[clamp(2.5rem,9cqw,4.5rem)] leading-[0.95] font-semibold tracking-[-0.04em] text-[#f4f4f5]">
          AcrossFlare
        </h1>
        <p className="mt-4 text-[clamp(0.75rem,2cqw,1.125rem)] whitespace-nowrap text-[#888888]">
          Secure Cloud & Network Optimization
        </p>
      </div>
    </div>
  );
}
