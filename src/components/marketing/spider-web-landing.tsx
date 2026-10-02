"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { HeroGrain } from "@/components/marketing/hero-grain";

const IDLE_HIDE_MS = 1400;
const SPARK_GAP_MS = 36;
const BOARD_SRC = "/marketing/motherboard-surface-flat.jpg";
const XRAY_SRC = "/marketing/motherboard-xray-flat.jpg";

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
    const count = 4 + Math.floor(Math.random() * 3);
    const next: Spark[] = [];
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 8 + Math.random() * 26;
      next.push({
        id: sparkId.current++,
        x: xPct + (Math.random() - 0.5) * 1.2,
        y: yPct + (Math.random() - 0.5) * 1.2,
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist - Math.random() * 6,
        size: 1.2 + Math.random() * 2.2,
        life: 240 + Math.random() * 260,
      });
    }
    setSparks((prev) => [...prev.slice(-36), ...next]);
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
    ? `radial-gradient(circle 12vmin at ${probe.x}% ${probe.y}%, #000 0%, #000 52%, transparent 82%)`
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
          0% { opacity: 1; transform: translate(-50%, -50%) scale(1.15); }
          100% { opacity: 0; transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(0.15); }
        }
        @keyframes af-mb-alive {
          0%, 100% { filter: contrast(1.08) saturate(1.05) brightness(1.02); }
          50% { filter: contrast(1.12) saturate(1.12) brightness(1.08); }
        }
        @keyframes af-mb-sweep {
          0% { transform: translateX(-30%) rotate(12deg); opacity: 0; }
          20% { opacity: 0.35; }
          50% { opacity: 0.2; }
          100% { transform: translateX(130%) rotate(12deg); opacity: 0; }
        }
        @keyframes af-mb-fan {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-[1] bg-black/[0.06] transition-opacity duration-400",
          probe ? "opacity-100" : "opacity-0"
        )}
        aria-hidden="true"
      />

      <div ref={boardRef} className="pointer-events-none absolute inset-0 z-[2]" aria-hidden="true">
        <div
          className="absolute inset-0"
          style={{
            opacity: probe ? 0.55 : 0,
            transition: "opacity 140ms ease-out",
            WebkitMaskImage: reveal,
            maskImage: reveal,
          }}
        >
          <img
            src={`${BOARD_SRC}?v=15`}
            alt=""
            draggable={false}
            className="absolute inset-0 size-full object-cover"
            style={{ filter: "contrast(1.04) saturate(0.85) brightness(0.88)" }}
          />
        </div>

        <div
          className="absolute inset-0"
          style={{
            opacity: probe ? 1 : 0,
            transition: "opacity 140ms ease-out",
            WebkitMaskImage: reveal,
            maskImage: reveal,
          }}
        >
          <img
            src={`${XRAY_SRC}?v=15`}
            alt=""
            draggable={false}
            className="absolute inset-0 size-full object-cover"
            style={{ animation: probe ? "af-mb-alive 2.8s ease-in-out infinite" : undefined }}
          />

          <div
            className="absolute inset-0 overflow-hidden"
            style={{ mixBlendMode: "screen", opacity: probe ? 0.55 : 0 }}
          >
            <div
              className="absolute inset-y-[-20%] left-0 w-[35%]"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.16), rgba(125,211,252,0.12), transparent)",
                animation: probe ? "af-mb-sweep 2.4s ease-in-out infinite" : undefined,
              }}
            />
          </div>

          {probe ? (
            <div
              className="absolute size-[4.5vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15"
              style={{
                left: `calc(${probe.x}% + 3.2vmin)`,
                top: `calc(${probe.y}% - 2.4vmin)`,
                background:
                  "radial-gradient(circle at 40% 40%, rgba(226,232,240,0.35), rgba(15,23,42,0.2) 55%, transparent 70%)",
                boxShadow: "0 0 12px rgba(125,211,252,0.25)",
              }}
            >
              <div
                className="absolute inset-[18%]"
                style={{
                  borderRadius: "50%",
                  background:
                    "conic-gradient(from 0deg, transparent 0 18%, rgba(226,232,240,0.55) 18% 28%, transparent 28% 48%, rgba(226,232,240,0.4) 48% 58%, transparent 58% 78%, rgba(226,232,240,0.5) 78% 88%, transparent 88% 100%)",
                  animation: "af-mb-fan 0.55s linear infinite",
                }}
              />
            </div>
          ) : null}
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
                "radial-gradient(circle, #ffffff 0%, #e2e8f0 35%, #7dd3fc 75%, #34d399 100%)",
              boxShadow: "0 0 8px rgba(226,232,240,0.75), 0 0 14px rgba(125,211,252,0.35)",
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
