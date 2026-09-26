"use client";

import { useEffect, useState } from "react";

export const LINE_MS = 1600;
export const GAP_MS = 320;

type LeadFrame = { index: number; count: number; done: boolean };

export function readServiceLead(value: unknown): readonly [string, string] | null {
  if (!Array.isArray(value) || value.length < 2) return null;
  const [first, second] = value;
  if (typeof first !== "string" || typeof second !== "string" || !first || !second) return null;
  return [first, second];
}

export function typingLeadFrame(elapsed: number, lines: readonly string[]): LeadFrame {
  let rest = Math.max(0, elapsed);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const length = Math.max(line.length, 1);
    if (rest < LINE_MS) {
      return {
        index,
        count: Math.min(line.length, Math.floor((rest / LINE_MS) * length)),
        done: false,
      };
    }
    rest -= LINE_MS;
    if (index < lines.length - 1 && rest < GAP_MS) {
      return { index, count: line.length, done: false };
    }
    if (index < lines.length - 1) rest -= GAP_MS;
  }
  const last = Math.max(lines.length - 1, 0);
  return { index: last, count: lines[last]?.length ?? 0, done: true };
}

export function TypingLead({ lines }: { lines: readonly [string, string] }) {
  const [reduced, setReduced] = useState(false);
  const [frame, setFrame] = useState<LeadFrame>({ index: 0, count: 0, done: false });
  const first = lines[0];
  const second = lines[1];

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const script = [first, second];
    let origin = performance.now();
    let pausedAt = 0;
    let signature = "";
    let raf = 0;

    const tick = (now: number) => {
      if (document.hidden) {
        if (!pausedAt) pausedAt = now;
        raf = requestAnimationFrame(tick);
        return;
      }
      if (pausedAt) {
        origin += now - pausedAt;
        pausedAt = 0;
      }
      const next = typingLeadFrame(now - origin, script);
      const mark = `${next.index}:${next.count}:${next.done}`;
      if (mark !== signature) {
        signature = mark;
        setFrame(next);
      }
      if (!next.done) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced, first, second]);

  const shown = reduced
    ? { index: 1, count: second.length, done: true }
    : frame;

  return (
    <div className="w-full">
      <p className="sr-only">
        {first} {second}
      </p>
      <div aria-hidden="true" className="flex flex-col items-center gap-1 text-sm leading-snug font-medium text-primary">
        {lines.map((line, index) => {
          const count = shown.done || index < shown.index ? line.length : index === shown.index ? shown.count : 0;
          const caret = !shown.done && index === shown.index;
          return (
            <p key={line} className="max-w-full">
              <span>{line.slice(0, count)}</span>
              {caret ? (
                <span className="ml-0.5 inline-block h-[0.85em] w-px translate-y-[0.08em] animate-pulse bg-primary align-middle" />
              ) : null}
              <span className="invisible">{line.slice(count)}</span>
            </p>
          );
        })}
      </div>
    </div>
  );
}
