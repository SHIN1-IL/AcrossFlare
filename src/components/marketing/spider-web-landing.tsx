"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { HeroGrain } from "@/components/marketing/hero-grain";

const IDLE_HIDE_MS = 1400;
const SPARK_GAP_MS = 36;
const BOARD_SRC = "/marketing/circuit-preview.jpg?v=22";

type Spark = {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  size: number;
  life: number;
};

/** Soft green aurora — top-right. Shared by home + `/dev/web-landing`. */
export function SpiderWebAurora() {
  return (
    <>
      <div
        className="pointer-events-none absolute -top-[12%] -right-[8%] z-[1] h-[58%] w-[52%]"
        style={{
          background:
            "radial-gradient(ellipse 72% 58% at 70% 32%, rgba(52,211,153,0.22) 0%, rgba(16,185,129,0.1) 38%, transparent 72%)",
          filter: "blur(32px)",
          animation: "af-mb-aurora 12s ease-in-out infinite",
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-[2%] right-[4%] z-[1] h-[26%] w-[28%]"
        style={{
          background:
            "radial-gradient(ellipse 55% 48% at 62% 38%, rgba(167,243,208,0.16) 0%, rgba(52,211,153,0.07) 48%, transparent 74%)",
          filter: "blur(20px)",
          animation: "af-mb-aurora 16s ease-in-out infinite reverse",
        }}
        aria-hidden="true"
      />
      <style>{`
        @keyframes af-mb-aurora {
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
      <SpiderWebAurora />
      <HeroGrain />
      <SpiderWebStage className="absolute inset-0" />
    </section>
  );
}

/** object-cover sized 16:9 plane so artwork % matches the board image. */
function BoardCoverPlane({ children }: { children: ReactNode }) {
  return (
    <div
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{
        width: "max(100cqw, calc(100cqh * 16 / 9))",
        height: "max(100cqh, calc(100cqw * 9 / 16))",
      }}
    >
      {children}
    </div>
  );
}

export function SpiderWebStage({ className }: { className?: string }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const idleTimer = useRef<number | null>(null);
  const sparkId = useRef(0);
  const lastSparkAt = useRef(0);
  const [probe, setProbe] = useState<{ x: number; y: number } | null>(null);
  const [sparks, setSparks] = useState<Spark[]>([]);

  useEffect(() => {
    return () => {
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
    };
  }, []);

  function clearIdle() {
    if (idleTimer.current) {
      window.clearTimeout(idleTimer.current);
      idleTimer.current = null;
    }
  }

  function armIdleHide() {
    clearIdle();
    idleTimer.current = window.setTimeout(() => {
      setProbe(null);
      setSparks([]);
    }, IDLE_HIDE_MS);
  }

  function emitSparks(xPct: number, yPct: number) {
    const now = performance.now();
    if (now - lastSparkAt.current < SPARK_GAP_MS) return;
    lastSparkAt.current = now;
    const count = 3 + Math.floor(Math.random() * 3);
    const next: Spark[] = [];
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 6 + Math.random() * 20;
      next.push({
        id: sparkId.current++,
        x: xPct + (Math.random() - 0.5) * 1.2,
        y: yPct + (Math.random() - 0.5) * 1.2,
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist - Math.random() * 6,
        size: 1 + Math.random() * 1.8,
        life: 220 + Math.random() * 220,
      });
    }
    setSparks((prev) => [...prev.slice(-28), ...next]);
  }

  function onPointerActivity(clientX: number, clientY: number) {
    const board = boardRef.current?.getBoundingClientRect();
    const stage = stageRef.current?.getBoundingClientRect();
    if (!board || !stage || board.width === 0 || board.height === 0) return;

    const bx = ((clientX - board.left) / board.width) * 100;
    const by = ((clientY - board.top) / board.height) * 100;
    const sx = ((clientX - stage.left) / stage.width) * 100;
    const sy = ((clientY - stage.top) / stage.height) * 100;

    if (bx < -2 || bx > 102 || by < -2 || by > 102) {
      setProbe(null);
      return;
    }

    setProbe({ x: bx, y: by });
    emitSparks(sx, sy);
    clearIdle();
    idleTimer.current = window.setTimeout(() => {
      setProbe(null);
      setSparks([]);
    }, 160);
  }

  const reveal = probe
    ? `radial-gradient(circle 13vmin at ${probe.x}% ${probe.y}%, #000 0%, #000 52%, transparent 82%)`
    : "radial-gradient(circle, transparent 0%, transparent 100%)";

  return (
    <div
      ref={stageRef}
      className={cn("select-none", className)}
      style={{ touchAction: "pan-y" }}
      onPointerMove={(event) => onPointerActivity(event.clientX, event.clientY)}
      onPointerDown={(event) => onPointerActivity(event.clientX, event.clientY)}
      onPointerUp={armIdleHide}
      onPointerCancel={armIdleHide}
      onPointerLeave={(event) => {
        if (event.pointerType !== "touch") armIdleHide();
      }}
    >
      <style>{`
        @keyframes af-mb-spark {
          0% { opacity: 0.85; transform: translate(-50%, -50%) scale(1.1); }
          100% { opacity: 0; transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(0.12); }
        }
      `}</style>

      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-[1] bg-black/12 transition-opacity duration-400",
          probe ? "opacity-100" : "opacity-0"
        )}
        aria-hidden="true"
      />

      <div
        ref={boardRef}
        className="pointer-events-none absolute inset-0 z-[2] overflow-hidden [container-type:size]"
        aria-hidden="true"
      >
        <BoardCoverPlane>
          <img
            src={BOARD_SRC}
            alt=""
            draggable={false}
            className="pointer-events-none absolute inset-0 size-full object-fill opacity-[0.3] select-none"
            style={{ filter: "brightness(0.6) contrast(0.88) saturate(0.4)" }}
          />
        </BoardCoverPlane>

        <div
          className="absolute inset-0"
          style={{
            opacity: probe ? 1 : 0,
            transition: "opacity 140ms ease-out",
            WebkitMaskImage: reveal,
            maskImage: reveal,
          }}
        >
          <BoardCoverPlane>
            <img
              src={BOARD_SRC}
              alt="Mainboard Circuit"
              draggable={false}
              className="pointer-events-none absolute inset-0 size-full object-fill select-none"
              style={{ filter: "brightness(1.08) contrast(1.02) saturate(0.62)" }}
            />
            <div className="pointer-events-none absolute inset-0 bg-[#0a0c10]/10 mix-blend-multiply" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_42%,rgba(8,10,14,0.22)_100%)]" />
          </BoardCoverPlane>
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
              background:
                "radial-gradient(circle, rgba(167,243,208,0.9) 0%, rgba(52,211,153,0.55) 55%, transparent 100%)",
              boxShadow: "0 0 6px rgba(16,185,129,0.35)",
              ["--dx" as string]: `${spark.dx}px`,
              ["--dy" as string]: `${spark.dy}px`,
              animation: `af-mb-spark ${spark.life}ms ease-out forwards`,
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
