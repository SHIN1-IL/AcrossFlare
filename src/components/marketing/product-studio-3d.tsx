"use client";

import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import type { Group, Mesh } from "three";
import * as THREE from "three";
import { cn } from "@/lib/utils";
import { HeroGrain } from "@/components/marketing/hero-grain";

const SPECS = [
  "암호화 터널 · 다중 경로 페일오버",
  "온디바이스 AI 라우팅 가속",
  "글로벌 노드 메시 · 저지연 핸드오프",
  "Vault · 보안 메모 · 키 백업",
  "실시간 트래픽 감시 · 이상 탐지",
  "원클릭 구독 · Clash/Karing 연동",
] as const;

/**
 * Trial: Mac Studio–like scroll assembly (original AcrossFlare geometry, not Apple assets).
 * Tall sticky section — scroll to watch parts assemble into the node.
 */
export function ProductStudioLanding({ className }: { className?: string }) {
  const sectionRef = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const onScroll = () => {
      const rect = section.getBoundingClientRect();
      const total = section.offsetHeight - window.innerHeight;
      if (total <= 0) {
        setProgress(1);
        return;
      }
      const raw = (-rect.top) / total;
      setProgress(Math.min(1, Math.max(0, raw)));
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const specCount = Math.min(SPECS.length, Math.floor(progress * (SPECS.length + 0.8)));

  return (
    <section
      ref={sectionRef}
      data-home-page
      className={cn("relative h-[260vh] snap-start bg-[#0f1216] max-md:snap-start", className)}
    >
      <div className="sticky top-0 h-dvh overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(226,232,240,0.05),transparent_30%,rgba(0,0,0,0.35)),repeating-linear-gradient(90deg,rgba(255,255,255,0.035)_0px,rgba(255,255,255,0.035)_1px,transparent_1px,transparent_5px)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[380px] bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.1),transparent_55%)]" />
        <HeroGrain />

        <div className="absolute inset-x-0 top-14 z-20 px-4 text-center sm:top-16">
          <p className="text-[11px] font-medium tracking-[0.2em] text-emerald-300/80 uppercase">Assembly preview</p>
          <h2 className="mt-2 text-[clamp(1.5rem,4.2vw,2.4rem)] font-semibold tracking-[-0.03em] text-[#f4f4f5]">
            AcrossFlare Engine
          </h2>
          <p className="mt-2 text-sm text-[#8f8f8f]">스크롤하면 부품이 조립됩니다 · 시범</p>
        </div>

        {/* Specs — Apple-style left rail */}
        <ul className="absolute top-1/2 left-4 z-20 hidden max-w-[min(42vw,20rem)] -translate-y-1/2 space-y-3 sm:left-8 md:block lg:left-12">
          {SPECS.map((line, i) => (
            <li
              key={line}
              className={cn(
                "flex items-start gap-3 text-[13px] leading-snug text-[#e8e8ea] transition-all duration-500",
                i < specCount ? "translate-x-0 opacity-100" : "translate-x-2 opacity-0"
              )}
            >
              <span className="mt-[3px] h-4 w-[3px] shrink-0 rounded-sm bg-[#f4f4f5]" />
              <span>{line}</span>
            </li>
          ))}
        </ul>

        <div className="absolute inset-0 z-[2]">
          <Suspense fallback={<StudioFallback />}>
            <Canvas
              dpr={[1, 1.6]}
              camera={{ position: [2.6, 1.7, 4.4], fov: 36 }}
              gl={{ antialias: true, alpha: true }}
              className="h-full w-full"
            >
              <fog attach="fog" args={["#0f1216", 6, 14]} />
              <color attach="background" args={["#0f1216"]} />
              <ambientLight intensity={0.35} />
              <directionalLight position={[5, 7, 4]} intensity={1.25} color="#f1f5f9" />
              <directionalLight position={[-4, 2, -3]} intensity={0.55} color="#34d399" />
              <pointLight position={[0.2, 0.6, 0.4]} intensity={1.1} color="#6ee7b7" distance={5} />
              <pointLight position={[-0.4, 0.2, -0.3]} intensity={0.55} color="#a78bfa" distance={4} />

              <AssemblyRig progress={progress} />
              <ContactShadows position={[0, -1.35, 0]} opacity={0.5} scale={12} blur={2.6} far={4} color="#000" />
            </Canvas>
          </Suspense>
        </div>

        <div className="absolute inset-x-0 bottom-6 z-20 flex justify-center">
          <div className="h-1 w-40 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-emerald-400 transition-[width] duration-150"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function StudioFallback() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="size-10 animate-pulse rounded-full bg-emerald-400/20" />
    </div>
  );
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function ease(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function stage(progress: number, start: number, end: number) {
  return ease(Math.min(1, Math.max(0, (progress - start) / (end - start))));
}

type PartProps = {
  progress: number;
  from: [number, number, number];
  to: [number, number, number];
  start?: number;
  end?: number;
  children: ReactNode;
};

function AssemblePart({ progress, from, to, start = 0, end = 1, children }: PartProps) {
  const t = stage(progress, start, end);
  const ref = useRef<Group>(null);
  useFrame(() => {
    if (!ref.current) return;
    ref.current.position.set(lerp(from[0], to[0], t), lerp(from[1], to[1], t), lerp(from[2], to[2], t));
    const s = lerp(0.86, 1, t);
    ref.current.scale.setScalar(s);
  });
  return <group ref={ref}>{children}</group>;
}

function Rail({
  args,
  position,
  rotation,
  color = "#2a2d33",
  emissive,
}: {
  args: [number, number, number];
  position: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
  emissive?: string;
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial
        color={color}
        metalness={0.78}
        roughness={0.32}
        emissive={emissive ?? "#000000"}
        emissiveIntensity={emissive ? 0.35 : 0}
      />
    </mesh>
  );
}

function SlotFace({ position, rotation }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  return (
    <mesh position={position} rotation={rotation}>
      <boxGeometry args={[0.08, 0.9, 0.04]} />
      <meshStandardMaterial color="#1a1c20" metalness={0.6} roughness={0.4} />
    </mesh>
  );
}

function AssemblyRig({ progress }: { progress: number }) {
  const core = useRef<Mesh>(null);
  const spin = useRef<Group>(null);
  const shellT = stage(progress, 0.72, 1);

  useFrame((_, delta) => {
    if (core.current) {
      const mat = core.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.45 + Math.sin(performance.now() / 450) * 0.2;
    }
    if (spin.current) spin.current.rotation.y += delta * (0.15 + progress * 0.4);
  });

  const camGroup = useRef<Group>(null);
  useFrame(() => {
    if (!camGroup.current) return;
    camGroup.current.rotation.y = lerp(0.35, -0.15, progress);
    camGroup.current.rotation.x = lerp(0.18, 0.08, progress);
  });

  const rails = useMemo(
    () =>
      [
        { from: [-2.4, 0.2, -0.2] as [number, number, number], to: [-0.85, 0.1, 0] as [number, number, number], color: "#3a3d45" },
        { from: [2.4, 0.3, -0.3] as [number, number, number], to: [0.85, 0.1, 0] as [number, number, number], color: "#2f6b55" },
        { from: [-1.8, 1.8, 0.4] as [number, number, number], to: [-0.55, 0.95, 0.15] as [number, number, number], color: "#4c3a66" },
        { from: [1.9, 1.7, 0.5] as [number, number, number], to: [0.55, 0.95, 0.15] as [number, number, number], color: "#3a3d45" },
      ] as const,
    []
  );

  return (
    <group ref={camGroup} position={[0.35, -0.2, 0]}>
      {/* Vertical T-slot style columns */}
      {rails.map((rail, i) => (
        <AssemblePart key={i} progress={progress} from={rail.from} to={rail.to} start={0.02 + i * 0.06} end={0.42 + i * 0.04}>
          <group>
            <Rail args={[0.16, 2.1, 0.16]} position={[0, 0, 0]} color={rail.color} />
            <SlotFace position={[0.09, 0, 0]} />
            <SlotFace position={[-0.09, 0, 0]} />
            <SlotFace position={[0, 0, 0.09]} rotation={[0, Math.PI / 2, 0]} />
            <SlotFace position={[0, 0, -0.09]} rotation={[0, Math.PI / 2, 0]} />
          </group>
        </AssemblePart>
      ))}

      {/* Horizontal cross beams */}
      <AssemblePart progress={progress} from={[0, 2.2, 0]} to={[0, 0.55, 0]} start={0.18} end={0.55}>
        <Rail args={[1.9, 0.12, 0.12]} position={[0, 0, 0]} color="#2c3038" />
      </AssemblePart>
      <AssemblePart progress={progress} from={[0, -2.0, 0.6]} to={[0, -0.55, 0]} start={0.22} end={0.58}>
        <Rail args={[1.9, 0.12, 0.12]} position={[0, 0, 0]} color="#2c3038" />
      </AssemblePart>
      <AssemblePart progress={progress} from={[0, 0.2, 2.3]} to={[0, 0.2, 0.55]} start={0.28} end={0.62}>
        <Rail args={[0.12, 0.12, 1.5]} position={[0, 0, 0]} color="#355f4d" emissive="#10b981" />
      </AssemblePart>

      {/* Memory / module bars */}
      {[-0.35, 0, 0.35].map((y, i) => (
        <AssemblePart
          key={`mem-${i}`}
          progress={progress}
          from={[2.2, y, 0.8]}
          to={[0.35, y * 0.4, 0.35]}
          start={0.35 + i * 0.05}
          end={0.7}
        >
          <mesh castShadow>
            <boxGeometry args={[0.7, 0.1, 0.22]} />
            <meshStandardMaterial color="#1c1c1e" metalness={0.7} roughness={0.28} />
          </mesh>
          <mesh position={[0, 0.06, 0]}>
            <boxGeometry args={[0.55, 0.02, 0.12]} />
            <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={0.5} toneMapped={false} />
          </mesh>
        </AssemblePart>
      ))}

      {/* Core compute block */}
      <AssemblePart progress={progress} from={[0, 2.6, -1.5]} to={[0, 0.15, 0]} start={0.4} end={0.78}>
        <mesh ref={core} castShadow>
          <boxGeometry args={[0.7, 0.7, 0.7]} />
          <meshStandardMaterial
            color="#14161a"
            metalness={0.65}
            roughness={0.25}
            emissive="#10b981"
            emissiveIntensity={0.5}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[0, 0, 0.36]}>
          <boxGeometry args={[0.45, 0.45, 0.02]} />
          <meshStandardMaterial color="#0a0c10" metalness={0.4} roughness={0.2} />
        </mesh>
      </AssemblePart>

      {/* Linkage / cooling arm */}
      <AssemblePart progress={progress} from={[1.8, -1.5, 1.4]} to={[0.55, -0.7, 0.45]} start={0.48} end={0.82}>
        <group>
          <Rail args={[0.08, 0.08, 0.9]} position={[0, 0, 0]} color="#8b5cf6" emissive="#7c3aed" />
          <mesh position={[0, 0, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.16, 0.03, 10, 24]} />
            <meshStandardMaterial color="#c4b5fd" metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
      </AssemblePart>

      {/* Scan plane */}
      <AssemblePart progress={progress} from={[0, 1.8, 0]} to={[0, lerp(0.9, -0.2, stage(progress, 0.55, 0.95)), 0]} start={0.5} end={1}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2.4, 2.4]} />
          <meshStandardMaterial
            color="#ecfdf5"
            emissive="#6ee7b7"
            emissiveIntensity={0.25}
            transparent
            opacity={0.12}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      </AssemblePart>

      {/* Outer shell closing in last */}
      <group ref={spin}>
        <AssemblePart progress={progress} from={[0, 0, 2.8]} to={[0, 0.05, 0]} start={0.72} end={1}>
          <mesh castShadow>
            <cylinderGeometry args={[1.05, 1.1, 1.05, 48]} />
            <meshStandardMaterial
              color="#1c1c1e"
              metalness={0.75}
              roughness={0.28}
              transparent
              opacity={lerp(0.15, 0.92, shellT)}
            />
          </mesh>
        </AssemblePart>
      </group>

      <mesh position={[0, -1.25, 0]} receiveShadow>
        <cylinderGeometry args={[1.4, 1.55, 0.06, 48]} />
        <meshStandardMaterial color="#12141a" metalness={0.5} roughness={0.5} />
      </mesh>
    </group>
  );
}
