"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { HeroGrain } from "@/components/marketing/hero-grain";
import { openHomePitch } from "@/components/marketing/home-pitch-target";
import { hasSignedInFlag, subscribeSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import "./spider-web-landing.css";

const VIDEO_SRC = "https://af1-cje.pages.dev/hero_compressed.mp4";

/** Guest home ad plays through this time, then the dust hero returns. */
export const HERO_AD_SECONDS = 10;
/** Footer hero keeps the original still this long, then the film starts. */
const HERO_STILL_MS = 10_000;
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
/** Dust converges slightly left of center, on the pitch. */
const VANISH_Y = 0.46;

function vanishXRatio(width: number) {
  return width >= 640 ? 0.4 : 0.46;
}

/** Night globe peeks from the bottom-right corner — tight arc, not a flat panel. Shared for dust occlusion. */
function earthLayout(width: number, height: number) {
  const radius = Math.min(width * 0.58, height * 0.52);
  // Peek from bottom-right; leave room so CJK isn't clipped by the viewport edges.
  const cx = width * 0.86;
  const cy = height * 0.7 + radius;
  return { cx, cy, radius };
}

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
function LandingDust({ focus = "pitch" }: { focus?: "pitch" | "center" }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const moteCount = focus === "pitch" ? 150 : 220;
    const motes = Array.from({ length: moteCount }, () => spawnMote(false));
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

      const originX = focus === "center" ? width * 0.5 : width * vanishXRatio(width);
      const originY = height * VANISH_Y;
      const reach = Math.min(width, height) * 0.62;
      const moving = !reduced.matches;
      const earth = focus === "pitch" ? earthLayout(width, height) : null;

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
        if (x < -24 || y < -24 || x > width + 24 || y > height + 24) continue;
        // Solid Earth occludes dust — never draw motes on the globe disc.
        if (earth && Math.hypot(x - earth.cx, y - earth.cy) <= earth.radius * 1.01) continue;

        const titleX = focus === "center" ? (x - width * 0.5) / (width * 0.24) : (x - originX) / (width * 0.3);
        const titleY = focus === "center" ? (y - height * 0.48) / (height * 0.12) : (y - originY) / (height * 0.22);
        const titleDistance = Math.hypot(titleX, titleY);
        const titleFade = titleDistance < 1 ? titleDistance * titleDistance : 1;
        const alpha = (0.12 + near * 0.72) * titleFade;
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
  }, [focus]);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}

/** Thin orbital haze over the illustrated globe. */
const CLOUD_APPROACH = 0.011;
/** One full turn of the illustrated Earth, milliseconds. */
const EARTH_ROTATION_MS = 60_000;
/** Full day→night cycle: 30s day + 30s night. */
const DAY_NIGHT_MS = 60_000;

/** 0 = full day, 1 = full night — slow sine dusk/dawn across the whole minute. */
function nightAmount(now: number, frozen = false) {
  if (frozen) return 0.35;
  const t = (now % DAY_NIGHT_MS) / DAY_NIGHT_MS;
  // Continuous gradient: noon(0) → dusk → midnight(1) → dawn → noon.
  return 0.5 - 0.5 * Math.cos(t * Math.PI * 2);
}

/** Soft desert ellipses [lon, lat, rLon, rLat] — sand tint on land. */
const DESERT_BLOBS: { lon: number; lat: number; rLon: number; rLat: number }[] = [
  { lon: 12, lat: 24, rLon: 24, rLat: 12 }, // Sahara
  { lon: 46, lat: 24, rLon: 15, rLat: 10 }, // Arabia
  { lon: 58, lat: 30, rLon: 11, rLat: 6.5 }, // Iran / Thar fringe
  { lon: 72, lat: 27, rLon: 6, rLat: 4 }, // Thar
  { lon: 105, lat: 40, rLon: 13, rLat: 7.5 }, // Gobi
  { lon: 133, lat: -26, rLon: 15, rLat: 10 }, // Interior Australia
  { lon: -112, lat: 33, rLon: 10, rLat: 6.5 }, // SW North America
  { lon: -68, lat: -20, rLon: 6, rLat: 8 }, // Atacama
  { lon: 20, lat: -26, rLon: 9, rLat: 6.5 }, // Kalahari / Namib
  { lon: 55, lat: 40, rLon: 8, rLat: 4 }, // Central Asia steppe-dry
];

/** Mountain / highland ellipses — lighten & cool peaks. */
const RANGE_BLOBS: { lon: number; lat: number; rLon: number; rLat: number; h: number }[] = [
  { lon: 85, lat: 30, rLon: 15, rLat: 6.5, h: 1 }, // Himalaya / Tibet
  { lon: 100, lat: 35, rLon: 11, rLat: 6.5, h: 0.78 }, // West China
  { lon: -108, lat: 42, rLon: 10, rLat: 15, h: 0.88 }, // Rockies
  { lon: -70, lat: -22, rLon: 5.5, rLat: 22, h: 0.96 }, // Andes
  { lon: 10, lat: 46, rLon: 7.5, rLat: 3.8, h: 0.72 }, // Alps
  { lon: 45, lat: 40, rLon: 8.5, rLat: 4.2, h: 0.58 }, // Caucasus
  { lon: 138, lat: 36, rLon: 4.2, rLat: 5.2, h: 0.52 }, // Japan spine
  { lon: -80, lat: 40, rLon: 5.5, rLat: 8.5, h: 0.48 }, // Appalachians
  { lon: 36, lat: 0, rLon: 5, rLat: 8, h: 0.55 }, // East Africa rift highlands
  { lon: 147, lat: -42, rLon: 3.5, rLat: 5, h: 0.4 }, // Tasmania / SE Aus high
];

/** Deep forest / rainforest — richer green on day land. */
const FOREST_BLOBS: { lon: number; lat: number; rLon: number; rLat: number; h: number }[] = [
  { lon: -62, lat: -5, rLon: 16, rLat: 10, h: 1 }, // Amazon
  { lon: 22, lat: 1, rLon: 12, rLat: 7, h: 0.9 }, // Congo
  { lon: 102, lat: 2, rLon: 10, rLat: 6, h: 0.85 }, // SE Asia / Borneo
  { lon: 115, lat: 0, rLon: 8, rLat: 5, h: 0.7 }, // New Guinea fringe
  { lon: -90, lat: 48, rLon: 12, rLat: 6, h: 0.45 }, // Canadian boreal
  { lon: 100, lat: 58, rLon: 28, rLat: 8, h: 0.4 }, // Siberian taiga
  { lon: -60, lat: -25, rLon: 8, rLat: 6, h: 0.5 }, // Atlantic forest / Pantanal fringe
];

/** Permanent ice / glacier sheets — bright white on land. */
const ICE_BLOBS: { lon: number; lat: number; rLon: number; rLat: number; h: number }[] = [
  // Antarctica (multi-lobed so the cap reads solid while spinning)
  { lon: 0, lat: -82, rLon: 55, rLat: 12, h: 1 },
  { lon: 90, lat: -80, rLon: 50, rLat: 12, h: 0.98 },
  { lon: -90, lat: -80, rLon: 48, rLat: 12, h: 0.98 },
  { lon: 180, lat: -80, rLon: 45, rLat: 11, h: 0.95 },
  { lon: -45, lat: -75, rLon: 28, rLat: 8, h: 0.85 }, // Weddell / Ronne fringe
  { lon: 160, lat: -77, rLon: 22, rLat: 7, h: 0.8 }, // Ross fringe
  // Greenland ice sheet
  { lon: -42, lat: 72, rLon: 16, rLat: 12, h: 1 },
  { lon: -42, lat: 78, rLon: 12, rLat: 7, h: 0.9 },
  { lon: -48, lat: 66, rLon: 9, rLat: 5, h: 0.7 }, // southern Greenland
  // Arctic Canada / Canadian Archipelago
  { lon: -95, lat: 75, rLon: 22, rLat: 8, h: 0.85 },
  { lon: -80, lat: 72, rLon: 14, rLat: 6, h: 0.7 },
  { lon: -110, lat: 74, rLon: 12, rLat: 5, h: 0.65 },
  // Alaska — Brooks Range, Alaska Range, coastal glaciers, Yukon
  { lon: -150, lat: 63, rLon: 12, rLat: 5.5, h: 0.88 }, // Alaska Range / Denali belt
  { lon: -145, lat: 68, rLon: 14, rLat: 4.5, h: 0.82 }, // Brooks Range / North Slope ice
  { lon: -138, lat: 60, rLon: 8, rLat: 4, h: 0.75 }, // SE Alaska / Glacier Bay
  { lon: -140, lat: 64, rLon: 9, rLat: 5, h: 0.7 }, // Yukon / Wrangell
  { lon: -162, lat: 66, rLon: 8, rLat: 3.5, h: 0.55 }, // Seward / west Alaska ice fringe
  // Other high-Arctic land ice
  { lon: 20, lat: 78, rLon: 10, rLat: 5, h: 0.7 }, // Svalbard
  { lon: 95, lat: 76, rLon: 16, rLat: 5, h: 0.55 }, // Taymyr / Severnaya fringe
  { lon: 150, lat: 70, rLon: 12, rLat: 4, h: 0.45 }, // E Siberia Arctic coast
  { lon: -70, lat: -50, rLon: 5, rLat: 4, h: 0.55 }, // Patagonia ice fields
];

/** Earth's axial obliquity (23.5°). */
const EARTH_OBLIQUITY = (23.5 * Math.PI) / 180;
/** Camera pitch — lift East Asia onto the visible face without collapsing it into a limb streak. */
const EARTH_VIEW_PITCH = 0.55;

type SkyCloud = {
  x: number;
  y: number;
  z: number;
  pace: number;
  scale: number;
  drift: number;
  stretch: number;
  wisps: { ox: number; oy: number; rx: number; ry: number; a: number }[];
};

type OrbitLight = { lon: number; lat: number; size: number; bright: number };

function rad(deg: number) {
  return (deg * Math.PI) / 180;
}

/** Tiny night pixel — size stays sub-pixel to a couple of CSS pixels. */
function pushLight(lights: OrbitLight[], lonDeg: number, latDeg: number, size: number, bright: number) {
  lights.push({ lon: rad(lonDeg), lat: rad(latDeg), size, bright });
}

function gauss() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(Math.PI * 2 * v);
}

/**
 * City as a cloud of micro amber sparks.
 * Big metros: dense core + wide suburb skirt. Towns: wider, still finer fill.
 */
function scatterMetro(
  lights: OrbitLight[],
  lonDeg: number,
  latDeg: number,
  count: number,
  spreadLon: number,
  spreadLat: number
) {
  const mega = count >= 28;
  const mid = count >= 14;
  // Wider metro footprint so night glow covers real urban regions.
  const sLon = spreadLon * 1.65;
  const sLat = spreadLat * 1.65;
  const coreShare = mega ? 0.58 : mid ? 0.42 : 0.28;
  const coreScale = mega ? 0.22 : mid ? 0.32 : 0.45;
  const skirtScale = mega ? 0.78 : mid ? 1.05 : 1.35;
  const sparks = mega
    ? Math.floor(count * 4.4)
    : mid
      ? Math.floor(count * 3.6)
      : Math.floor(count * 2.8);

  for (let i = 0; i < sparks; i++) {
    let placed = false;
    for (let tryN = 0; tryN < 8 && !placed; tryN += 1) {
      const core = Math.random() < coreShare;
      const u = gauss() * (core ? coreScale : skirtScale);
      const v = gauss() * (core ? coreScale : skirtScale);
      const fall = Math.min(1, Math.hypot(u, v));
      if (fall > 1.15) continue;
      // Keep most skirt sparks — density reads as city glow, not a few dots.
      if (!core && Math.random() > (mega ? 0.88 : mid ? 0.72 : 0.55)) continue;
      const lon = lonDeg + u * sLon;
      const lat = latDeg + v * sLat;
      if (!isLandLonLat(rad(lon), rad(lat))) continue;
      const size = core
        ? 0.025 + Math.pow(Math.random(), 2.4) * 0.18
        : 0.015 + Math.pow(Math.random(), 2.8) * 0.1;
      const bright = core
        ? 0.34 + (1 - fall) * 0.44 + Math.random() * 0.08
        : 0.1 + (1 - fall) * 0.26 + Math.random() * 0.1;
      pushLight(lights, lon, lat, size, Math.min(0.92, bright));
      placed = true;
    }
  }
}

/**
 * Coast / corridor with weighted density along the path.
 * Soft gaussian width — never a neon road line.
 */
function scatterCoast(
  lights: OrbitLight[],
  path: [number, number][],
  count: number,
  widthLon: number,
  widthLat: number,
  keep = 0.55
) {
  const segLens: number[] = [];
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const dx = path[i + 1][0] - path[i][0];
    const dy = path[i + 1][1] - path[i][1];
    const len = Math.hypot(dx, dy) || 0.001;
    segLens.push(len);
    total += len;
  }
  const wLon = widthLon * 1.55;
  const wLat = widthLat * 1.55;
  const sparks = Math.floor(count * 3.2);
  for (let i = 0; i < sparks; i++) {
    let walk = Math.random() * total;
    let seg = 0;
    while (seg < segLens.length - 1 && walk > segLens[seg]) {
      walk -= segLens[seg];
      seg += 1;
    }
    const a = path[seg];
    const b = path[seg + 1];
    const t = walk / segLens[seg];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = segLens[seg];
    const nx = -dy / len;
    const ny = dx / len;
    const across = gauss() * 0.55;
    if (Math.random() > keep + 0.12 - Math.min(0.28, Math.abs(across) * 0.22)) continue;
    const lon = a[0] + dx * t + nx * across * wLon;
    const lat = a[1] + dy * t + ny * across * wLat;
    if (!isLandLonLat(rad(lon), rad(lat))) continue;
    const near = Math.min(1, Math.abs(across));
    const size = 0.015 + Math.pow(Math.random(), 2.6) * (near < 0.4 ? 0.14 : 0.08);
    const bright = 0.08 + (1 - near) * 0.3 + Math.random() * 0.12;
    pushLight(lights, lon, lat, size, bright);
  }
}

/** Soft organic inland patch — ellipse, not a rectangle. */
function scatterPatch(
  lights: OrbitLight[],
  lonDeg: number,
  latDeg: number,
  count: number,
  rx: number,
  ry: number,
  keep = 0.4
) {
  const sparks = Math.floor(count * 2.8);
  for (let i = 0; i < sparks; i++) {
    const u = gauss() * 0.58;
    const v = gauss() * 0.58;
    if (Math.hypot(u, v) > 1.12) continue;
    if (Math.random() > keep + 0.18) continue;
    const lon = lonDeg + u * rx * 1.45;
    const lat = latDeg + v * ry * 1.45;
    if (!isLandLonLat(rad(lon), rad(lat))) continue;
    const size = 0.015 + Math.pow(Math.random(), 2.8) * 0.09;
    const bright = 0.07 + Math.random() * 0.2;
    pushLight(lights, lon, lat, size, bright);
  }
}

function spawnCloud(far: boolean): SkyCloud {
  const wispCount = 4 + Math.floor(Math.random() * 3);
  return {
    x: (Math.random() - 0.5) * 2.4,
    y: 0.35 + Math.random() * 0.7,
    z: far ? 0.8 + Math.random() * 0.2 : 0.32 + Math.random() * 0.68,
    pace: 0.22 + Math.random() * 0.28,
    scale: 1.05 + Math.random() * 1.35,
    drift: (Math.random() - 0.5) * 0.012,
    stretch: 2.1 + Math.random() * 1.6,
    wisps: Array.from({ length: wispCount }, () => ({
      ox: (Math.random() - 0.5) * 1.6,
      oy: (Math.random() - 0.5) * 0.28,
      rx: 0.7 + Math.random() * 1.1,
      ry: 0.12 + Math.random() * 0.2,
      a: 0.22 + Math.random() * 0.35,
    })),
  };
}

/**
 * Fixed night lights on the sphere.
 * Density follows real night-Earth: bright coasts/metros, dark interiors & seas
 * so China / Korea / Japan (and other continents while spinning) stay readable.
 */
function buildOrbitMap(): OrbitLight[] {
  const lights: OrbitLight[] = [];

  // —— China: east-coast night belt (Bohai → Yangtze → Pearl); west stays dark ——
  scatterCoast(
    lights,
    [
      [121.6, 38.9], // Dalian
      [120.4, 36.1], // Qingdao
      [119.0, 34.5],
      [121.5, 31.2], // Shanghai
      [120.2, 30.3], // Hangzhou
      [119.0, 27.5],
      [118.0, 24.5],
      [114.1, 22.55], // Shenzhen
      [113.3, 23.1], // Guangzhou
      [110.4, 21.2],
    ],
    220,
    1.35,
    0.95,
    0.78
  );
  // North China Plain — soft inland glow between metros
  scatterPatch(lights, 116.5, 36.5, 90, 3.6, 2.8, 0.48);
  scatterPatch(lights, 118.5, 32.5, 55, 2.4, 1.8, 0.42); // Yangtze corridor fill
  scatterMetro(lights, 116.4, 39.9, 48, 0.95, 0.62); // Beijing
  scatterMetro(lights, 117.2, 39.1, 22, 0.55, 0.38); // Tianjin
  scatterMetro(lights, 121.5, 31.2, 58, 1.05, 0.58); // Shanghai
  scatterMetro(lights, 120.2, 30.25, 20, 0.48, 0.34); // Hangzhou
  scatterMetro(lights, 118.8, 32.05, 18, 0.45, 0.3); // Nanjing
  scatterMetro(lights, 114.3, 30.55, 20, 0.58, 0.4); // Wuhan
  scatterMetro(lights, 113.25, 23.15, 40, 0.78, 0.5); // Guangzhou
  scatterMetro(lights, 114.15, 22.5, 32, 0.48, 0.34); // Shenzhen / HK
  // Isolated inland hubs (readable as "not coast")
  scatterMetro(lights, 104.07, 30.67, 22, 0.62, 0.44); // Chengdu
  scatterMetro(lights, 106.55, 29.56, 20, 0.52, 0.38); // Chongqing
  scatterMetro(lights, 108.94, 34.34, 16, 0.48, 0.34); // Xi'an
  scatterMetro(lights, 126.65, 45.75, 14, 0.45, 0.32); // Harbin
  scatterMetro(lights, 121.55, 25.03, 20, 0.38, 0.48); // Taiwan

  // —— Yellow Sea stays dark (gap) then Korea ——
  scatterCoast(
    lights,
    [
      [126.7, 37.85],
      [127.05, 37.45],
      [127.2, 36.5],
      [127.55, 35.85],
      [128.35, 35.35],
      [129.05, 35.12],
    ],
    75,
    0.48,
    0.34,
    0.72
  );
  scatterPatch(lights, 127.3, 36.4, 40, 0.85, 1.4, 0.45); // Korea inland fill
  scatterMetro(lights, 126.98, 37.56, 52, 0.52, 0.38); // Seoul
  scatterMetro(lights, 126.65, 37.46, 18, 0.34, 0.22); // Incheon
  scatterMetro(lights, 129.04, 35.14, 24, 0.4, 0.28); // Busan
  scatterMetro(lights, 128.6, 35.87, 12, 0.28, 0.22); // Daegu

  // —— Sea of Japan gap, then Japan Pacific belt ——
  scatterCoast(
    lights,
    [
      [130.4, 33.58],
      [132.45, 34.35],
      [135.5, 34.68],
      [136.9, 35.15],
      [139.7, 35.68],
      [140.85, 38.2],
      [141.2, 41.0],
      [141.35, 43.05],
    ],
    140,
    0.58,
    0.4,
    0.74
  );
  scatterMetro(lights, 139.69, 35.68, 55, 0.62, 0.42); // Tokyo
  scatterMetro(lights, 135.5, 34.68, 32, 0.48, 0.34); // Osaka
  scatterMetro(lights, 136.9, 35.17, 18, 0.36, 0.28); // Nagoya
  scatterMetro(lights, 130.4, 33.59, 14, 0.36, 0.28); // Fukuoka
  scatterMetro(lights, 141.35, 43.06, 12, 0.38, 0.28); // Sapporo

  // —— India / SE Asia (finer; visible while spinning) ——
  scatterCoast(
    lights,
    [
      [72.9, 19.1],
      [77.2, 28.6],
      [80.9, 26.8],
      [88.4, 22.6],
    ],
    85,
    1.05,
    0.7,
    0.65
  );
  scatterMetro(lights, 77.2, 28.61, 28, 0.62, 0.42);
  scatterMetro(lights, 72.88, 19.08, 26, 0.52, 0.36);
  scatterMetro(lights, 80.27, 13.08, 14, 0.38, 0.28);
  scatterMetro(lights, 88.36, 22.57, 16, 0.42, 0.3);
  scatterMetro(lights, 106.85, 10.82, 20, 0.45, 0.34);
  scatterMetro(lights, 100.5, 13.75, 16, 0.4, 0.3);
  scatterMetro(lights, 101.7, 3.14, 14, 0.34, 0.24);
  scatterMetro(lights, 106.85, -6.2, 24, 0.48, 0.34);

  // —— Europe ——
  scatterCoast(
    lights,
    [
      [-4.3, 51.5],
      [-0.12, 51.5],
      [2.35, 48.85],
      [4.9, 52.37],
      [6.95, 50.94],
      [9.18, 48.78],
      [13.4, 52.52],
      [21.0, 52.23],
    ],
    120,
    1.2,
    0.8,
    0.68
  );
  scatterMetro(lights, -0.12, 51.5, 28, 0.5, 0.36);
  scatterMetro(lights, 2.35, 48.86, 24, 0.45, 0.34);
  scatterMetro(lights, 13.41, 52.52, 20, 0.42, 0.3);
  scatterMetro(lights, 12.5, 41.9, 14, 0.36, 0.28);
  scatterMetro(lights, -3.7, 40.42, 14, 0.36, 0.28);
  scatterMetro(lights, 28.98, 41.01, 16, 0.42, 0.3);
  scatterMetro(lights, 37.62, 55.75, 20, 0.5, 0.36);

  // —— Middle East / Africa ——
  scatterMetro(lights, 55.27, 25.2, 18, 0.4, 0.28);
  scatterMetro(lights, 46.72, 24.69, 14, 0.34, 0.24);
  scatterMetro(lights, 31.24, 30.04, 20, 0.42, 0.3);
  scatterMetro(lights, 3.38, 6.52, 14, 0.36, 0.28);
  scatterMetro(lights, 36.82, -1.29, 14, 0.34, 0.24);
  scatterMetro(lights, 18.42, -33.92, 14, 0.36, 0.28);

  // —— Americas ——
  scatterCoast(
    lights,
    [
      [-71.06, 42.36],
      [-74.0, 40.71],
      [-75.17, 39.95],
      [-77.04, 38.91],
      [-80.19, 25.76],
    ],
    75,
    0.85,
    0.55,
    0.65
  );
  scatterCoast(
    lights,
    [
      [-122.42, 37.77],
      [-121.89, 37.34],
      [-118.24, 34.05],
      [-117.16, 32.72],
    ],
    45,
    0.55,
    0.38,
    0.65
  );
  scatterMetro(lights, -74.0, 40.71, 32, 0.58, 0.4);
  scatterMetro(lights, -87.63, 41.88, 20, 0.48, 0.34);
  scatterMetro(lights, -95.37, 29.76, 14, 0.4, 0.28);
  scatterMetro(lights, -96.8, 32.78, 14, 0.4, 0.28);
  scatterMetro(lights, -118.24, 34.05, 26, 0.52, 0.34);
  scatterMetro(lights, -122.42, 37.77, 18, 0.42, 0.3);
  scatterMetro(lights, -79.38, 43.65, 14, 0.4, 0.28);
  scatterMetro(lights, -99.13, 19.43, 24, 0.48, 0.34);
  scatterMetro(lights, -46.63, -23.55, 26, 0.55, 0.36);
  scatterMetro(lights, -58.38, -34.6, 16, 0.42, 0.3);
  scatterMetro(lights, -70.67, -33.45, 14, 0.34, 0.24);

  // —— Oceania ——
  scatterMetro(lights, 151.21, -33.87, 18, 0.42, 0.3);
  scatterMetro(lights, 144.96, -37.81, 14, 0.36, 0.28);
  scatterMetro(lights, 174.76, -36.85, 10, 0.3, 0.22);

  return lights;
}

/**
 * Geographic lon/lat → screen, with axial spin then obliquity tilt.
 * Y = north; camera looks along +Z. Sphere outline stays round;
 * surface features orbit the tilted polar axis.
 */
function projectOrbit(
  lon: number,
  lat: number,
  rot: number,
  cx: number,
  cy: number,
  radius: number,
  obliquity = EARTH_OBLIQUITY
): { x: number; y: number; z: number } | null {
  // ECEF-ish: +Y north, +Z toward initial prime-facing camera.
  const x = Math.cos(lat) * Math.sin(lon);
  const y = Math.sin(lat);
  const z = Math.cos(lat) * Math.cos(lon);

  // Sidereal spin around the geographic polar axis.
  const cr = Math.cos(rot);
  const sr = Math.sin(rot);
  const xSpin = x * cr + z * sr;
  const zSpin = -x * sr + z * cr;
  const ySpin = y;

  // Obliquity: lean the north pole (rotate around X).
  const ct = Math.cos(obliquity);
  const st = Math.sin(obliquity);
  const xT = xSpin;
  const yTilt = ySpin * ct - zSpin * st;
  const zTilt = ySpin * st + zSpin * ct;

  // Elevated view: bring populated mid-latitudes onto the upper limb.
  const cp = Math.cos(EARTH_VIEW_PITCH);
  const sp = Math.sin(EARTH_VIEW_PITCH);
  const yT = yTilt * cp + zTilt * sp;
  const zT = -yTilt * sp + zTilt * cp;

  if (zT < 0.02) return null;
  return { x: cx + xT * radius, y: cy - yT * radius, z: zT };
}

/** Screen → lon/lat (radians). Inverse of projectOrbit for front-face samples. */
function unprojectOrbit(
  sx: number,
  sy: number,
  rot: number,
  cx: number,
  cy: number,
  radius: number,
  obliquity = EARTH_OBLIQUITY
): { lon: number; lat: number; z: number } | null {
  const nx = (sx - cx) / radius;
  const ny = -(sy - cy) / radius;
  const nz2 = 1 - nx * nx - ny * ny;
  if (nz2 < 0.0004) return null;
  const nz = Math.sqrt(nz2);

  const cp = Math.cos(EARTH_VIEW_PITCH);
  const sp = Math.sin(EARTH_VIEW_PITCH);
  const yTilt = ny * cp - nz * sp;
  const zTilt = ny * sp + nz * cp;
  const xT = nx;

  const ct = Math.cos(obliquity);
  const st = Math.sin(obliquity);
  const ySpin = yTilt * ct + zTilt * st;
  const zSpin = -yTilt * st + zTilt * ct;
  const xSpin = xT;

  const cr = Math.cos(rot);
  const sr = Math.sin(rot);
  const x = xSpin * cr - zSpin * sr;
  const z = xSpin * sr + zSpin * cr;
  const y = ySpin;

  return { lon: Math.atan2(x, z), lat: Math.asin(Math.max(-1, Math.min(1, y))), z: nz };
}

/** Natural Earth 50m land (+ lakes) pre-rasterized equirectangular mask. */
const LAND_MASK_W = 2048;
const LAND_MASK_H = 1024;
const LAND_MASK_URL = "/marketing/earth-land-mask.png";
const LAND_MASK_KEY = `ne50m-lakes|${LAND_MASK_W}x${LAND_MASK_H}`;
/** Near-hard land mask (0–255). Tiny blur only — crisp coasts, mild AA. */
let landMask: Uint8Array | null = null;
/** Wide blur of land — high near coasts → shallow shelf in open ocean. */
let shelfMask: Uint8Array | null = null;
let landMaskKey = "";
let landMaskLoad: Promise<void> | null = null;

function wrapLonMaskX(x: number) {
  const w = LAND_MASK_W;
  let v = x % w;
  if (v < 0) v += w;
  return v;
}

function sampleMaskBilinear(mask: Uint8Array, lonRad: number, latRad: number): number {
  let lonDeg = (lonRad * 180) / Math.PI;
  while (lonDeg < -180) lonDeg += 360;
  while (lonDeg > 180) lonDeg -= 360;
  const latDeg = (latRad * 180) / Math.PI;
  const x = ((lonDeg + 180) / 360) * LAND_MASK_W - 0.5;
  const y = ((90 - latDeg) / 180) * LAND_MASK_H - 0.5;
  if (y < -0.5 || y > LAND_MASK_H - 0.5) return 0;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = x0 + 1;
  const y1 = Math.min(LAND_MASK_H - 1, y0 + 1);
  const fx = x - x0;
  const fy = y - y0;
  const y0c = Math.max(0, Math.min(LAND_MASK_H - 1, y0));
  const i00 = mask[y0c * LAND_MASK_W + wrapLonMaskX(x0)];
  const i10 = mask[y0c * LAND_MASK_W + wrapLonMaskX(x1)];
  const i01 = mask[y1 * LAND_MASK_W + wrapLonMaskX(x0)];
  const i11 = mask[y1 * LAND_MASK_W + wrapLonMaskX(x1)];
  const top = i00 + (i10 - i00) * fx;
  const bot = i01 + (i11 - i01) * fx;
  return (top + (bot - top) * fy) / 255;
}

function readMaskChannel(ctx: CanvasRenderingContext2D): Uint8Array {
  const data = ctx.getImageData(0, 0, LAND_MASK_W, LAND_MASK_H).data;
  const mask = new Uint8Array(LAND_MASK_W * LAND_MASK_H);
  for (let i = 0; i < mask.length; i += 1) mask[i] = data[i * 4];
  return mask;
}

/** Load Natural Earth land mask + bake a soft coastal shelf once. */
function ensureEarthMasks(): Promise<void> {
  if (landMask && shelfMask && landMaskKey === LAND_MASK_KEY) return Promise.resolve();
  if (landMaskLoad) return landMaskLoad;
  landMaskLoad = (async () => {
    const empty = new Uint8Array(LAND_MASK_W * LAND_MASK_H);
    const canvas = document.createElement("canvas");
    canvas.width = LAND_MASK_W;
    canvas.height = LAND_MASK_H;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      landMask = empty;
      shelfMask = empty;
      landMaskKey = LAND_MASK_KEY;
      return;
    }
    try {
      const img = new Image();
      img.decoding = "async";
      img.src = LAND_MASK_URL;
      await img.decode();
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, LAND_MASK_W, LAND_MASK_H);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(img, 0, 0, LAND_MASK_W, LAND_MASK_H);
      // Mild AA so coasts stay crisp without crawl on spin.
      const soft = document.createElement("canvas");
      soft.width = LAND_MASK_W;
      soft.height = LAND_MASK_H;
      const softCtx = soft.getContext("2d", { willReadFrequently: true });
      if (softCtx) {
        softCtx.filter = "blur(0.55px)";
        softCtx.drawImage(canvas, 0, 0);
        softCtx.filter = "none";
        ctx.clearRect(0, 0, LAND_MASK_W, LAND_MASK_H);
        ctx.drawImage(soft, 0, 0);
      }
      landMask = readMaskChannel(ctx);

      const shelfCanvas = document.createElement("canvas");
      shelfCanvas.width = LAND_MASK_W;
      shelfCanvas.height = LAND_MASK_H;
      const shelfCtx = shelfCanvas.getContext("2d", { willReadFrequently: true });
      if (shelfCtx) {
        shelfCtx.filter = "blur(10px)";
        shelfCtx.drawImage(canvas, 0, 0);
        shelfCtx.filter = "none";
        shelfMask = readMaskChannel(shelfCtx);
      } else {
        shelfMask = empty;
      }
    } catch {
      landMask = empty;
      shelfMask = empty;
    }
    landMaskKey = LAND_MASK_KEY;
  })();
  return landMaskLoad;
}

function landCoverage(lonRad: number, latRad: number): number {
  if (!landMask) return 0;
  return sampleMaskBilinear(landMask, lonRad, latRad);
}

/** 0 open-ocean deep → 1 coastal shelf. */
function shelfCoverage(lonRad: number, latRad: number): number {
  if (!shelfMask) return 0;
  return sampleMaskBilinear(shelfMask, lonRad, latRad);
}

function isLandLonLat(lonRad: number, latRad: number): boolean {
  return landCoverage(lonRad, latRad) > 0.42;
}

function blobField(
  lonDeg: number,
  latDeg: number,
  blobs: { lon: number; lat: number; rLon: number; rLat: number; h?: number }[]
): number {
  let m = 0;
  for (const b of blobs) {
    let dLon = lonDeg - b.lon;
    if (dLon > 180) dLon -= 360;
    if (dLon < -180) dLon += 360;
    const u = dLon / b.rLon;
    const v = (latDeg - b.lat) / b.rLat;
    const g = Math.exp(-0.5 * (u * u + v * v)) * (b.h ?? 1);
    if (g > m) m = g;
  }
  return m;
}

function lonLatDeg(lonRad: number, latRad: number): { lon: number; lat: number } {
  let lon = (lonRad * 180) / Math.PI;
  while (lon < -180) lon += 360;
  while (lon > 180) lon -= 360;
  return { lon, lat: (latRad * 180) / Math.PI };
}

/**
 * Simple green-tinted night-Earth illustration under the pitch:
 * soft globe, dense East-Asia night pixels, slow rotation, thin haze.
 */
function LandingNightFlight() {
  const cityRef = useRef<HTMLCanvasElement>(null);
  const cloudRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cityCanvas = cityRef.current;
    const cloudCanvas = cloudRef.current;
    if (!cityCanvas || !cloudCanvas) return;
    const cityCtx = cityCanvas.getContext("2d");
    const cloudCtx = cloudCanvas.getContext("2d");
    if (!cityCtx || !cloudCtx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const clouds = Array.from({ length: 5 }, () => spawnCloud(false));
    let lights: OrbitLight[] = [];
    const landLayer = document.createElement("canvas");
    let landLayerCtx: CanvasRenderingContext2D | null = null;
    let landImage: ImageData | null = null;
    let frame = 0;
    let last = performance.now();
    let cancelled = false;

    const resize = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const pw = Math.floor(w * dpr);
      const ph = Math.floor(h * dpr);
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw;
        canvas.height = ph;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const paintCity = (width: number, height: number, now: number) => {
      cityCtx.clearRect(0, 0, width, height);

      // Rigid body spin; light alpha is fixed so points don't shimmer with cloud cover.
      const turn = reduced.matches ? 0 : ((now % EARTH_ROTATION_MS) / EARTH_ROTATION_MS) * Math.PI * 2;
      const rot = -2.22 + turn;
      const night = nightAmount(now, reduced.matches);
      const day = 1 - night;
      const { cx, cy, radius } = earthLayout(width, height);
      if (!landMask) return;

      cityCtx.save();
      cityCtx.beginPath();
      cityCtx.arc(cx, cy, radius, 0, Math.PI * 2);
      cityCtx.clip();

      // —— Globe: blend day (sunlit blue) ↔ night (navy + city lights) ——
      if (landLayer.width !== width || landLayer.height !== height) {
        landLayer.width = width;
        landLayer.height = height;
        landLayerCtx = landLayer.getContext("2d");
      }
      const octx = landLayerCtx;
      if (octx) {
        if (!landImage || landImage.width !== width || landImage.height !== height) {
          landImage = octx.createImageData(width, height);
        } else {
          landImage.data.fill(0);
        }
        const px = landImage.data;
        const minX = Math.max(0, Math.floor(cx - radius));
        const maxX = Math.min(width - 1, Math.ceil(cx + radius));
        const minY = Math.max(0, Math.floor(cy - radius));
        const maxY = Math.min(height - 1, Math.ceil(cy + radius));
        const r2 = radius * radius;
        for (let sy = minY; sy <= maxY; sy += 1) {
          for (let sx = minX; sx <= maxX; sx += 1) {
            const dx = sx + 0.5 - cx;
            const dy = sy + 0.5 - cy;
            const d2 = dx * dx + dy * dy;
            if (d2 > r2) continue;
            const geo = unprojectOrbit(sx + 0.5, sy + 0.5, rot, cx, cy, radius);
            if (!geo) continue;
            const edge = Math.sqrt(d2) / radius;
            const edgeFade = edge > 0.96 ? Math.max(0, 1 - (edge - 0.96) / 0.04) : 1;
            const nx = dx / radius;
            const ny = dy / radius;
            const sun = Math.max(0, -nx * 0.38 - ny * 0.58 + geo.z * 0.82);
            const sunPow = sun * sun;
            const face = Math.max(0, -nx * 0.25 - ny * 0.4 + geo.z * 0.7);
            const litDay = 0.42 + 0.58 * sun;
            const litNight = 0.55 + 0.45 * face;
            const lit = litDay * day + litNight * night;
            const { lon: lonDeg, lat: latDeg } = lonLatDeg(geo.lon, geo.lat);
            const cover = landCoverage(geo.lon, geo.lat);
            const shelf = shelfCoverage(geo.lon, geo.lat);
            // Keep shelf glow off the hard coast so the land/sea edge stays crisp.
            const shelfSea = Math.max(0, shelf - cover * 0.85);
            const deep = Math.max(0, 1 - shelfSea * 1.05);
            const shallow = 1 - deep;
            const shadeAmt = 1 - sun;

            // Day ocean
            let dr = 5 + shallow * 22 + deep * 3 + sunPow * (22 + shallow * 48);
            let dg = 24 + shallow * 88 + deep * 20 + sunPow * (38 + shallow * 62);
            let db = 52 + shallow * 125 + deep * 58 + sunPow * (48 + shallow * 58);
            dr *= 1 - deep * shadeAmt * 0.5;
            dg *= 1 - deep * shadeAmt * 0.42;
            db *= 1 - deep * shadeAmt * 0.25;
            let da = 0.5 + deep * 0.14 + shallow * 0.06 + sunPow * 0.08;

            // Night ocean
            let nr = 4 + shallow * 10 + deep * 2;
            let ng = 10 + shallow * 28 + deep * 8;
            let nb = 28 + shallow * 52 + deep * 36;
            let na = 0.55 + deep * 0.18 + shallow * 0.06;

            // Steep coast mix — narrow soft band so land/sea reads as a hard line.
            if (cover > 0.22) {
              const desert = blobField(lonDeg, latDeg, DESERT_BLOBS);
              const elev = blobField(lonDeg, latDeg, RANGE_BLOBS);
              const forest = blobField(lonDeg, latDeg, FOREST_BLOBS);
              const iceSheet = blobField(lonDeg, latDeg, ICE_BLOBS);
              const absLat = Math.abs(latDeg);
              // Polar latitude wash + explicit glacier sheets (Greenland, Antarctica, Alaska…).
              const polarIce = Math.max(0, Math.min(1, (absLat - 68) / 16));
              const ice = Math.min(1, Math.max(polarIce * 0.85, iceSheet * 1.15));
              const tundra = Math.max(0, Math.min(1, (absLat - 55) / 14)) * (1 - ice);
              // Fine geographic grain so continents don't look airbrushed.
              const grain =
                0.5 +
                0.5 *
                  Math.sin(lonDeg * 7.1 + latDeg * 5.3) *
                  Math.sin(lonDeg * 3.7 - latDeg * 9.1);
              const t = Math.min(1, Math.max(0, (cover - 0.28) / 0.34));
              const k = t * t * (3 - 2 * t);

              let dlr = 34 + elev * 28 + sunPow * 18 - forest * 10;
              let dlg = 78 + elev * 26 + sunPow * 20 + forest * 28 - desert * 8;
              let dlb = 58 + elev * 18 + sunPow * 14 - forest * 18 - desert * 6;
              dlr = dlr * (1 - desert) + (128 + elev * 18 + grain * 8) * desert;
              dlg = dlg * (1 - desert) + (102 + elev * 10 + grain * 6) * desert;
              dlb = dlb * (1 - desert) + (52 + elev * 8 + grain * 4) * desert;
              // Boreal / tundra cools greens toward grey-olive.
              dlr = dlr * (1 - tundra) + (72 + elev * 10) * tundra;
              dlg = dlg * (1 - tundra) + (86 + elev * 8) * tundra;
              dlb = dlb * (1 - tundra) + (78 + elev * 6) * tundra;
              // Glacier / ice sheet — bright white with cool blue shadow.
              const iceR = 236 + sunPow * 18 + grain * 6;
              const iceG = 242 + sunPow * 12 + grain * 4;
              const iceB = 250 + sunPow * 6;
              dlr = dlr * (1 - ice) + iceR * ice;
              dlg = dlg * (1 - ice) + iceG * ice;
              dlb = dlb * (1 - ice) + iceB * ice;
              dlr = dlr * (0.94 + grain * 0.12);
              dlg = dlg * (0.94 + grain * 0.12);
              dlb = dlb * (0.94 + grain * 0.12);
              // Ice keeps more albedo in shade; rock/vegetation darkens more.
              const iceShade = shadeAmt * (0.2 - ice * 0.12);
              dlr *= 1 - iceShade;
              dlg *= 1 - iceShade * 0.9;
              dlb *= 1 - iceShade * 0.75;
              const dLandA = 0.5 + cover * 0.3 + elev * 0.05 + ice * 0.16;
              dr = dr * (1 - k) + dlr * k;
              dg = dg * (1 - k) + dlg * k;
              db = db * (1 - k) + dlb * k;
              da = da * (1 - k) + dLandA * k;

              let nlr = 10 + elev * 10 + shallow * 4;
              let nlg = 16 + elev * 14 + shallow * 6 + forest * 4;
              let nlb = 30 + elev * 18 + shallow * 10;
              nlr = nlr * (1 - desert * 0.35) + (22 + elev * 6) * desert * 0.35;
              nlg = nlg * (1 - desert * 0.35) + (24 + elev * 6) * desert * 0.35;
              nlb = nlb * (1 - desert * 0.35) + (36 + elev * 8) * desert * 0.35;
              // Night ice still reads as pale blue-white sheets.
              nlr = nlr * (1 - ice) + (48 + elev * 6 + grain * 4) * ice;
              nlg = nlg * (1 - ice) + (62 + elev * 6 + grain * 3) * ice;
              nlb = nlb * (1 - ice) + (88 + elev * 8) * ice;
              const nLandA = 0.52 + cover * 0.3 + elev * 0.05 + ice * 0.12;
              nr = nr * (1 - k) + nlr * k;
              ng = ng * (1 - k) + nlg * k;
              nb = nb * (1 - k) + nlb * k;
              na = na * (1 - k) + nLandA * k;
            }

            const r = dr * day + nr * night;
            const g = dg * day + ng * night;
            const b = db * day + nb * night;
            const a = (da * day + na * night) * lit * edgeFade * (0.72 + geo.z * 0.28);
            const ai = Math.min(255, Math.floor(a * 255));
            if (ai < 6) continue;
            const i = (sy * width + sx) * 4;
            px[i] = Math.min(255, Math.floor(r * lit));
            px[i + 1] = Math.min(255, Math.floor(g * lit));
            px[i + 2] = Math.min(255, Math.floor(b * lit));
            px[i + 3] = ai;
          }
        }
        octx.putImageData(landImage, 0, 0);
        cityCtx.drawImage(landLayer, 0, 0);
      }

      // Sphere veil — day sun sheen ↔ night indigo depth.
      const shade = cityCtx.createRadialGradient(
        cx - radius * 0.22,
        cy - radius * 0.36,
        radius * 0.1,
        cx,
        cy,
        radius
      );
      shade.addColorStop(0, `rgba(${Math.round(160 * day + 40 * night)}, ${Math.round(210 * day + 70 * night)}, ${Math.round(245 * day + 110 * night)}, ${0.1 * day + 0.04 * night})`);
      shade.addColorStop(0.4, `rgba(60, 120, 180, ${0.03 * day})`);
      shade.addColorStop(0.7, "rgba(0, 0, 0, 0)");
      shade.addColorStop(0.88, `rgba(0, ${Math.round(8 * day + 6 * night)}, ${Math.round(20 * day + 18 * night)}, ${0.12 * day + 0.2 * night})`);
      shade.addColorStop(1, `rgba(0, 4, 12, ${0.08 + 0.08 * night})`);
      cityCtx.fillStyle = shade;
      cityCtx.beginPath();
      cityCtx.arc(cx, cy, radius, 0, Math.PI * 2);
      cityCtx.fill();

      // City lights — sodium-amber micro sparks; density = city size.
      if (night > 0.02) {
        cityCtx.save();
        cityCtx.imageSmoothingEnabled = false;
        cityCtx.globalCompositeOperation = "lighter";
        for (const lamp of lights) {
          if (!isLandLonLat(lamp.lon, lamp.lat)) continue;
          const p = projectOrbit(lamp.lon, lamp.lat, rot, cx, cy, radius);
          if (!p) continue;
          const edge = Math.hypot(p.x - cx, p.y - cy) / radius;
          if (edge > 0.995) continue;
          const edgeFade = edge > 0.92 ? Math.max(0, 1 - (edge - 0.92) / 0.075) : 1;
          const alpha =
            (0.35 + lamp.bright * 0.55) * (0.5 + p.z * 0.5) * edgeFade * night;
          if (alpha < 0.028) continue;
          // Half-pixel snap — stops crawl/shimmer while the globe spins.
          const x = Math.round(p.x * 2) / 2;
          const y = Math.round(p.y * 2) / 2;
          const core = 0.28 + lamp.size * 0.55;
          if (lamp.bright > 0.55 && core > 0.4) {
            const haloR = core * 2.1;
            const halo = cityCtx.createRadialGradient(x, y, 0, x, y, haloR);
            halo.addColorStop(0, `rgba(255, 140, 55, ${Math.min(0.28, alpha * 0.32)})`);
            halo.addColorStop(0.55, `rgba(255, 110, 40, ${Math.min(0.12, alpha * 0.14)})`);
            halo.addColorStop(1, "rgba(180, 60, 20, 0)");
            cityCtx.fillStyle = halo;
            cityCtx.beginPath();
            cityCtx.arc(x, y, haloR, 0, Math.PI * 2);
            cityCtx.fill();
          }
          // Warm pin-prick core (real night-Earth sodium look).
          cityCtx.fillStyle = `rgba(255, ${Math.round(150 + lamp.bright * 40)}, ${Math.round(70 + lamp.bright * 30)}, ${Math.min(0.95, alpha)})`;
          cityCtx.fillRect(x - core * 0.45, y - core * 0.45, core * 0.9, core * 0.9);
        }
        cityCtx.restore();
      }
      cityCtx.restore();

      // Outer airglow — atmosphere skimming the surface (outside disc only).
      // Soft green scintillation; the Earth edge reads from contact, not a stroke.
      cityCtx.save();
      cityCtx.beginPath();
      cityCtx.rect(0, 0, width, height);
      cityCtx.arc(cx, cy, radius - 0.15, 0, Math.PI * 2, true);
      cityCtx.clip("evenodd");

      const glowReach = Math.max(7, radius * 0.052);
      const air = cityCtx.createRadialGradient(cx, cy, radius, cx, cy, radius + glowReach);
      const glowA = 0.09 * day + 0.14 * night;
      // Chartreuse → warm amber: sits between land green and city sodium.
      air.addColorStop(0, `rgba(210, 230, 140, ${glowA})`);
      air.addColorStop(0.1, `rgba(200, 195, 110, ${glowA * 0.65})`);
      air.addColorStop(0.3, `rgba(190, 150, 80, ${glowA * 0.26})`);
      air.addColorStop(0.65, `rgba(160, 100, 55, ${glowA * 0.07})`);
      air.addColorStop(1, "rgba(90, 50, 30, 0)");
      cityCtx.fillStyle = air;
      cityCtx.beginPath();
      cityCtx.arc(cx, cy, radius + glowReach, 0, Math.PI * 2);
      cityCtx.fill();

      // Sparse green–orange flecks just outside the rim — slow pulse, not crawl.
      cityCtx.globalCompositeOperation = "lighter";
      const flecks = 36;
      for (let i = 0; i < flecks; i += 1) {
        const ang = (i / flecks) * Math.PI * 2 + i * 0.17;
        const pulse = 0.5 + 0.5 * Math.sin(now * 0.00085 + i * 1.91);
        if (pulse < 0.35) continue;
        const rOff = radius + 0.6 + (i % 4) * 0.7 + pulse * 1.1;
        const fx = cx + Math.cos(ang) * rOff;
        const fy = cy + Math.sin(ang) * rOff;
        const a = (0.02 + pulse * 0.04) * (0.55 + 0.3 * night);
        const sparkR = 1.4 + pulse * 1.2;
        const warm = i % 3 === 0;
        const spark = cityCtx.createRadialGradient(fx, fy, 0, fx, fy, sparkR);
        if (warm) {
          spark.addColorStop(0, `rgba(255, 190, 120, ${a})`);
          spark.addColorStop(0.45, `rgba(230, 140, 70, ${a * 0.42})`);
          spark.addColorStop(1, "rgba(140, 70, 30, 0)");
        } else {
          spark.addColorStop(0, `rgba(220, 240, 150, ${a})`);
          spark.addColorStop(0.45, `rgba(170, 200, 100, ${a * 0.42})`);
          spark.addColorStop(1, "rgba(90, 110, 40, 0)");
        }
        cityCtx.fillStyle = spark;
        cityCtx.beginPath();
        cityCtx.arc(fx, fy, sparkR, 0, Math.PI * 2);
        cityCtx.fill();
      }
      cityCtx.restore();
    };

    const paintClouds = (width: number, height: number, now: number, dt: number, moving: boolean) => {
      cloudCtx.clearRect(0, 0, width, height);
      const { cx: earthX, cy: earthY, radius } = earthLayout(width, height);
      const weather = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(now * 0.00028 + 1.2));
      let coverSum = 0;
      let coverWeight = 0.001;

      cloudCtx.save();
      cloudCtx.beginPath();
      cloudCtx.arc(earthX, earthY, radius * 1.02, 0, Math.PI * 2);
      cloudCtx.clip();

      for (const cloud of clouds) {
        if (moving) {
          cloud.z -= dt * CLOUD_APPROACH * cloud.pace * (0.55 + (1 - weather) * 0.4);
          cloud.x += cloud.drift * dt;
          if (cloud.z < 0.18) {
            const next = spawnCloud(true);
            next.x = 0.2 + Math.random() * 0.8;
            next.y = 0.55 + Math.random() * 0.4;
            Object.assign(cloud, next);
          }
        }

        const depth = 1 / cloud.z;
        const cx = earthX + (cloud.x - 0.5) * radius * 1.1 * depth * 0.55;
        const cy = earthY - radius * 0.55 + cloud.y * radius * 0.7;
        const base = cloud.scale * depth * Math.min(width, height) * 0.12;
        const dist = Math.hypot(cx - earthX, cy - earthY);
        if (dist > radius + base) continue;

        const near = Math.max(0, 1 - cloud.z);
        const sheetAlpha = (0.01 + near * 0.025) * (0.25 + (1 - weather) * 0.5);

        for (const wisp of cloud.wisps) {
          const bx = cx + wisp.ox * base * cloud.stretch * 0.45;
          const by = cy + wisp.oy * base * 0.3;
          const brx = base * wisp.rx * cloud.stretch;
          const bry = base * wisp.ry;
          const alpha = sheetAlpha * wisp.a;
          const grad = cloudCtx.createRadialGradient(bx, by, Math.min(brx, bry) * 0.25, bx, by, brx);
          grad.addColorStop(0, `rgba(180, 200, 210, ${alpha})`);
          grad.addColorStop(0.5, `rgba(110, 130, 140, ${alpha * 0.28})`);
          grad.addColorStop(1, "rgba(40, 50, 55, 0)");
          cloudCtx.fillStyle = grad;
          cloudCtx.beginPath();
          cloudCtx.ellipse(bx, by, brx, bry, -0.2, 0, Math.PI * 2);
          cloudCtx.fill();

          coverSum += alpha * (brx / (width * 0.2));
          coverWeight += 1;
        }
      }
      cloudCtx.restore();

      const cover = Math.min(1, (coverSum / coverWeight) * 1.05);
      return Math.max(0.75, Math.min(1, (1 - cover * 0.25) * (0.7 + weather * 0.35)));
    };

    const paint = (now: number) => {
      const width = cityCanvas.clientWidth;
      const height = cityCanvas.clientHeight;
      if (width < 2 || height < 2) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      resize(cityCanvas, cityCtx, width, height);
      resize(cloudCanvas, cloudCtx, width, height);

      const moving = !reduced.matches;
      paintClouds(width, height, now, dt, moving);
      paintCity(width, height, now);
    };

    const tick = (now: number) => {
      paint(now);
      frame = requestAnimationFrame(tick);
    };

    void ensureEarthMasks().then(() => {
      if (cancelled) return;
      // Build lights after mask so land tests match real coasts.
      lights = buildOrbitMap();
      if (reduced.matches) {
        paint(performance.now());
        return;
      }
      frame = requestAnimationFrame(tick);
    });

    const observer = new ResizeObserver(() => {
      if (landMask) paint(performance.now());
    });
    observer.observe(cityCanvas);

    return () => {
      cancelled = true;
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <>
      <div aria-hidden className="pointer-events-none absolute inset-0 z-[2] overflow-hidden">
        <canvas ref={cityRef} className="absolute inset-0 h-full w-full" />
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-0 z-[3] overflow-hidden">
        <canvas ref={cloudRef} className="absolute inset-0 h-full w-full" />
      </div>
    </>
  );
}

/** Soft green→violet aurora behind the page-1 pitch. */
function PitchAurora() {
  return (
    <div aria-hidden className="af-pitch-gas">
      <span className="af-pitch-layer af-pitch-green" />
      <span className="af-pitch-layer af-pitch-violet" />
      <span className="af-pitch-layer af-pitch-mint" />
    </div>
  );
}

/** Soft green gas behind the footer title still. */
function LandingGas() {
  return (
    <div aria-hidden className="af-gas">
      <span className="af-gas-layer af-gas-wide" />
      <span className="af-gas-layer af-gas-high" />
      <span className="af-gas-layer af-gas-low" />
    </div>
  );
}

function ChinaMark() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 168 120"
      className="pointer-events-none absolute top-1/2 left-1/2 h-auto w-[2.35em] -translate-x-[56%] -translate-y-1/2 text-[#e11d48]/30"
    >
      <path
        fill="currentColor"
        d="M150 22.2 160.4 24.3 156.9 32.2 151.8 39.4 144.2 43.7 134 48.5 127.9 45.5 121.3 53.3 130 56.1 125.4 59.4 129 74.5 127.9 83.6 122.3 92.1 116.3 98.1 108.6 101.2 99 106 93.4 103.6 89.3 99.4 80.2 100 75.1 103 70 97.5 66 83 51.7 84.8 35.7 83 21.3 70.9 9.1 56.4 5.5 49.1 14.2 43.4 25.6 31.2 39.6 20.3 49.7 29.1 65 40 85.3 41.8 101.8 32.8 115.2 24.3 123.9 16.4 133.5 7 141.7 7.6 151.3 21.3Z"
      />
      <ellipse cx="98.7" cy="112" rx="5.2" ry="3" fill="currentColor" />
    </svg>
  );
}

function LandingPitch() {
  const t = useTranslations("heroDeck");
  const items = ["pitchItem1", "pitchItem2"] as const;
  const [tailLead, tailRest = ""] = t("pitchTail").split("\n");
  const stacked = tailRest.length > 0;

  return (
    <div className="pointer-events-none absolute inset-0 z-[4]">
      <div className="absolute top-[40%] left-[46%] w-[min(90vw,40rem)] -translate-x-1/2 -translate-y-1/2 sm:left-[40%]">
        <PitchAurora />
        <p className="relative text-center text-[clamp(0.78rem,1.6vw,0.95rem)] font-semibold tracking-[-0.02em] text-[#6ee7b7]">
          {WORDMARK}
        </p>
        <h1 className="relative mt-2 text-center text-[clamp(1.15rem,2.7vw,1.95rem)] leading-[1.55] font-semibold tracking-[-0.03em] text-[#f4f4f5]">
          <span className={cn(stacked && "block")}>
            {t("pitchLead")}
            <span className="relative inline-block align-middle whitespace-nowrap">
              <ChinaMark />
              <span className="relative">{t("pitchPlace")}</span>
            </span>
            {tailLead}
          </span>
          <span className={cn(stacked && "mt-1 block")}>
            {tailRest}
            <span className="relative inline-block px-[0.72em] align-middle">
              <svg
                aria-hidden
                viewBox="0 0 74 72"
                className="absolute top-1/2 left-1/2 h-[2.35em] w-[2.4em] -translate-x-[46%] -translate-y-[58%]"
              >
                <path d="M1 28 L27 66.3 L71 6 L27 55.7Z" fill="#34d399" />
              </svg>
              <span
                className="relative z-10 font-bold whitespace-nowrap text-white"
                style={{ textShadow: "0 1px 2px rgba(0, 0, 0, 0.85)" }}
              >
                {t("pitchMust")}
              </span>
            </span>
            {t("pitchAfter")}
          </span>
        </h1>
        <p className="relative mt-2.5 text-center text-[clamp(0.7rem,1.5vw,0.85rem)] text-[#888888]">
          {WORDMARK_SUB}
        </p>
        <div className="relative mx-auto mt-9 grid w-max grid-cols-[1.45em_auto_auto] items-center gap-x-3 gap-y-3 text-left text-[clamp(0.95rem,2.1vw,1.3rem)] leading-none font-medium">
          {items.map((key, index) => (
            <button
              key={key}
              type="button"
              className={cn(
                "pointer-events-auto col-span-3 grid cursor-pointer grid-cols-subgrid items-center rounded-md text-left font-medium",
                index === 0 ? "group/one" : "group/two"
              )}
              onClick={() => openHomePitch(index === 0 ? "esim" : "network")}
            >
              <span
                className={cn(
                  "af-pitch-badge-pulse inline-flex h-[1.45em] items-center justify-center rounded-md bg-[#34d399]/18 font-semibold text-[#6ee7b7] tabular-nums transition-colors",
                  index === 0 &&
                    "group-hover/one:bg-[#22c55e] group-hover/one:text-[#052e16] group-focus-visible/one:bg-[#22c55e] group-focus-visible/one:text-[#052e16]",
                  index === 1 &&
                    "group-hover/two:bg-[#a3e635] group-hover/two:text-[#1a2e05] group-focus-visible/two:bg-[#a3e635] group-focus-visible/two:text-[#1a2e05]"
                )}
              >
                {index + 1}
              </span>
              <span
                className={cn(
                  "text-[#e7e5e4] transition-colors",
                  index === 0 && "group-hover/one:text-[#4ade80] group-focus-visible/one:text-[#4ade80]",
                  index === 1 && "group-hover/two:text-[#bef264] group-focus-visible/two:text-[#bef264]"
                )}
              >
                {t.rich(key, {
                  accent: (chunks) => (
                    <span
                      className={cn(
                        "transition-colors",
                        index === 0
                          ? "text-[#f2a56a] group-hover/one:text-[#f8c08a] group-focus-visible/one:text-[#f8c08a]"
                          : "text-[#89b7d6] group-hover/two:text-[#a9c7e0] group-focus-visible/two:text-[#a9c7e0]"
                      )}
                    >
                      {chunks}
                    </span>
                  ),
                })}
              </span>
              <span
                className={cn(
                  "text-[0.72em] font-normal tracking-wide text-[#71717a] opacity-0 transition-opacity",
                  index === 0 && "group-hover/one:opacity-100 group-focus-visible/one:opacity-100",
                  index === 1 && "group-hover/two:opacity-100 group-focus-visible/two:opacity-100"
                )}
              >
                {t("pitchCompare")}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const WORDMARK = "AcrossFlare";
const WORDMARK_SUB = "Secure Cloud & Network Optimization";

function OriginalWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="pointer-events-none text-center">
      <h1
        className={cn(
          "leading-none font-semibold tracking-[-0.03em] text-[#6ee7b7]",
          compact ? "text-[clamp(1.6rem,5vw,2.75rem)]" : "text-[clamp(2.25rem,7vw,3.75rem)]"
        )}
        style={{ textShadow: "0 1px 2px rgba(0, 0, 0, 0.55)" }}
      >
        {WORDMARK}
      </h1>
      <p
        className={cn(
          "mt-2 leading-normal text-[#888888]",
          compact ? "text-[clamp(0.7rem,1.6vw,1rem)]" : "text-[clamp(0.75rem,2vw,1.125rem)]"
        )}
      >
        {WORDMARK_SUB}
      </p>
    </div>
  );
}

function OriginalHeroStill() {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(226,232,240,0.05),transparent_34%,rgba(0,0,0,0.28)),repeating-linear-gradient(90deg,rgba(255,255,255,0.03)_0px,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_5px)]" />
      <LandingDust focus="center" />
      <HeroGrain />
      <div className="pointer-events-none absolute inset-0 z-[4] flex items-center justify-center">
        <div className="relative text-center">
          <LandingGas />
          <h1 className="relative text-[clamp(2.5rem,8vw,4.25rem)] leading-[0.95] font-semibold tracking-[-0.04em] text-[#f4f4f5]">
            {WORDMARK}
          </h1>
          <p className="relative mt-4 text-[clamp(0.75rem,2vw,1.125rem)] leading-normal whitespace-nowrap text-[#888888]">
            {WORDMARK_SUB}
          </p>
        </div>
      </div>
    </>
  );
}

function DarkGreenLanding({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <section
      data-home-page={compact ? undefined : ""}
      className={cn(
        "relative overflow-hidden bg-[#0e1014]",
        compact ? "min-h-0 flex-1" : "h-dvh snap-center snap-always max-md:snap-start",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(226,232,240,0.05),transparent_34%,rgba(0,0,0,0.28)),repeating-linear-gradient(90deg,rgba(255,255,255,0.03)_0px,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_5px)]" />
      <HeroGrain />
      <LandingDust />
      <LandingNightFlight />
      <LandingPitch />
    </section>
  );
}

function useSignedInHero() {
  return useSyncExternalStore(subscribeSession, hasSignedInFlag, () => false);
}

export function SpiderWebLanding({
  className,
  compact = false,
  variant = "video",
}: {
  className?: string;
  compact?: boolean;
  variant?: "video" | "dust";
}) {
  const signedIn = useSignedInHero();
  if (variant === "dust") return <DarkGreenLanding className={className} compact={compact} />;
  if (compact) return <HeroVideoLanding className={className} compact hold />;
  if (signedIn) return <DarkGreenLanding className={className} />;
  return <GuestHomeHero className={className} />;
}

/** Home only: play the film, rest on the signed-in hero, replay after an idle pause. */
function GuestHomeHero({ className, compact = false }: { className?: string; compact?: boolean }) {
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
    const section = document.querySelector("[data-landing-hero]");
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

  if (reduced || !showingAd) return <DarkGreenLanding className={className} compact={compact} />;
  return (
    <HeroVideoLanding
      key={adRun}
      className={className}
      compact={compact}
      onFinished={() => setShowingAd(false)}
    />
  );
}

function HeroVideoLanding({
  className,
  compact = false,
  hold = false,
  onFinished,
}: {
  className?: string;
  compact?: boolean;
  hold?: boolean;
  onFinished?: () => void;
}) {
  const t = useTranslations("heroDeck");
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const frozenRef = useRef(false);
  const finishedRef = useRef(false);
  const restartingRef = useRef(false);
  const onFinishedRef = useRef(onFinished);
  const [frozen, setFrozen] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [failed, setFailed] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [captionId, setCaptionId] = useState<HeroCaptionId | null>(null);
  const [film, setFilm] = useState(!hold);
  const restingRef = useRef(false);

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
    if (!hold || reduced || failed || film) return;
    const section = sectionRef.current;
    if (!section) return;

    let timer = 0;
    const clear = () => {
      window.clearTimeout(timer);
      timer = 0;
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.45);
        if (visible && !timer) {
          timer = window.setTimeout(() => setFilm(true), HERO_STILL_MS);
          return;
        }
        if (!visible) clear();
      },
      { threshold: [0, 0.45, 0.7] }
    );
    observer.observe(section);
    return () => {
      clear();
      observer.disconnect();
    };
  }, [hold, reduced, failed, film]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || reduced || failed || (hold && !film)) return;

    restingRef.current = false;
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

    const restOnDust = () => {
      if (restingRef.current) return;
      restingRef.current = true;
      video.pause();
      setVideoReady(false);
      setCaptionId(null);
      setFilm(false);
    };

    const tick = () => {
      if (restartingRef.current || finishedRef.current || restingRef.current) return;
      if (hold) {
        if (video.currentTime >= HERO_AD_SECONDS) restOnDust();
      } else if (onFinishedRef.current) {
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
      if (finishedRef.current || frozenRef.current || restingRef.current) return;
      const start = () => {
        void video.play().then(() => setVideoReady(true)).catch(() => {});
      };
      if (video.ended) {
        video.addEventListener("seeked", start, { once: true });
        video.currentTime = 0;
        return;
      }
      start();
    };

    const onEnded = () => {
      syncCaption();
      if (hold) {
        restOnDust();
        return;
      }
      if (onFinishedRef.current) {
        finish();
        return;
      }
      video.pause();
      frozenRef.current = true;
      setFrozen(true);
    };

    const markReady = () => setVideoReady(true);

    video.addEventListener("ended", onEnded);
    video.addEventListener("timeupdate", tick);
    video.addEventListener("play", watchFrames);
    video.addEventListener("loadeddata", play);
    video.addEventListener("canplay", markReady);

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
      video.removeEventListener("canplay", markReady);
      if (frame && typeof video.cancelVideoFrameCallback === "function") {
        video.cancelVideoFrameCallback(frame);
      }
      observer.disconnect();
    };
  }, [reduced, failed, hold, film]);

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
      ref={sectionRef}
      data-home-page={compact ? undefined : ""}
      data-landing-hero=""
      className={cn(
        "relative overflow-hidden bg-[#0e1014]",
        compact ? "min-h-0 flex-1" : "-mt-14 h-dvh snap-center snap-always max-md:snap-start",
        className
      )}
    >
      {failed || !film || !videoReady ? <OriginalHeroStill /> : null}
      {failed ? null : (
        <video
          ref={videoRef}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
            film && videoReady ? "opacity-100" : "opacity-0"
          )}
          muted
          playsInline
          preload="metadata"
          onError={() => {
            setFailed(true);
            onFinished?.();
          }}
          webkit-playsinline=""
        >
          <source src={VIDEO_SRC} type="video/mp4" />
        </video>
      )}

      {film ? (
        <>
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-28 bg-[linear-gradient(to_bottom,rgba(20,24,30,0.72),transparent)]"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-28 bg-[linear-gradient(to_top,#14181e,transparent)]"
            aria-hidden="true"
          />
        </>
      ) : null}

      {frozen && !failed ? (
        <div
          aria-hidden
          onClick={replay}
          title={t("heroReplayHint")}
          className="absolute inset-0 z-[3] cursor-pointer touch-pan-y"
        />
      ) : null}

      {film && videoReady ? (
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 z-[4] flex justify-center px-6",
            compact ? "bottom-[12%]" : "bottom-[22%] sm:bottom-[20%]"
          )}
        >
          <OriginalWordmark compact={compact} />
        </div>
      ) : null}

      {captionId && videoReady && !failed ? (
        <p
          aria-live="polite"
          className="pointer-events-none absolute inset-x-0 z-[4] px-16 text-center leading-[0.95] font-bold tracking-[-0.04em] text-white"
          style={{
            bottom: compact ? "3%" : "8%",
            fontSize: compact ? "clamp(1rem, 2.8vw, 1.55rem)" : "clamp(1.45rem, 4vw, 2.2rem)",
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
