"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Default: let the screen settle ~1.5s, then one natural press, then advance. */
export const STORY_TOUCH_DEFAULT = {
  settleMs: 1500,
  pressHoldMs: 480,
  afterReleaseMs: 650,
} as const;

export type StoryTouchTiming = {
  /** Time after the screen appears before the press starts. */
  settleMs?: number;
  /** How long the pressed / ripple state stays on. */
  pressHoldMs?: number;
  /** Pause after release before advancing to the next step. */
  afterReleaseMs?: number;
};

/**
 * One press per step — screen first, then a single highlight, then onDone.
 */
export function useStoryTouchCycle(
  active: boolean,
  cycleKey: string | number,
  onDone?: () => void,
  timing?: StoryTouchTiming
) {
  const settleMs = timing?.settleMs ?? STORY_TOUCH_DEFAULT.settleMs;
  const pressHoldMs = timing?.pressHoldMs ?? STORY_TOUCH_DEFAULT.pressHoldMs;
  const afterReleaseMs = timing?.afterReleaseMs ?? STORY_TOUCH_DEFAULT.afterReleaseMs;

  const [visible, setVisible] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [nudge, setNudge] = useState(0);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!active) {
      setVisible(false);
      setPressed(false);
      return;
    }

    let cancelled = false;
    const timers: number[] = [];
    const pressAt = settleMs;
    const releaseAt = settleMs + pressHoldMs;
    const advanceAt = settleMs + pressHoldMs + afterReleaseMs;

    setVisible(false);
    setPressed(false);

    // Cue becomes visible slightly before the press so the target reads as “about to tap”.
    timers.push(
      window.setTimeout(() => {
        if (cancelled) return;
        setVisible(true);
        setNudge((n) => n + 1);
      }, Math.max(0, pressAt - 180))
    );
    timers.push(
      window.setTimeout(() => {
        if (!cancelled) setPressed(true);
      }, pressAt)
    );
    timers.push(
      window.setTimeout(() => {
        if (!cancelled) setPressed(false);
      }, releaseAt)
    );
    timers.push(
      window.setTimeout(() => {
        if (!cancelled) onDoneRef.current?.();
      }, advanceAt)
    );

    return () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [active, cycleKey, settleMs, pressHoldMs, afterReleaseMs]);

  return { visible, pressed, nudge };
}

/** Pressed-state chrome for the tapped control (scale + glow ring). */
export function storyTouchTargetClass(pressed: boolean) {
  return cn(
    "relative transition-[transform,filter,box-shadow] duration-150 ease-out",
    pressed &&
      "scale-[0.94] brightness-110 shadow-[0_0_0_2px_rgba(52,211,153,0.95),0_0_22px_rgba(52,211,153,0.45)]"
  );
}

type StoryTouchHighlightProps = {
  visible: boolean;
  pressed: boolean;
  nudge: number;
  className?: string;
};

/** Ripple + flash on the tapped control — once per step. */
export function StoryTouchHighlight({
  visible,
  pressed,
  nudge,
  className,
}: StoryTouchHighlightProps) {
  if (!visible) return null;

  return (
    <span
      className={cn(
        "pointer-events-none absolute inset-0 z-30 overflow-hidden rounded-[inherit]",
        className
      )}
      aria-hidden="true"
    >
      <style>{`
        @keyframes af-touch-ripple {
          0% { transform: translate(-50%, -50%) scale(0.2); opacity: 0.85; }
          100% { transform: translate(-50%, -50%) scale(2.4); opacity: 0; }
        }
        @keyframes af-touch-flash {
          0% { opacity: 0.55; }
          100% { opacity: 0; }
        }
      `}</style>

      {pressed ? (
        <>
          <span
            key={`flash-${nudge}`}
            className="absolute inset-0 bg-emerald-300/35"
            style={{ animation: "af-touch-flash 0.45s ease-out both" }}
          />
          <span
            key={`ripple-${nudge}`}
            className="absolute top-1/2 left-1/2 size-10 rounded-full border-2 border-emerald-300 bg-emerald-400/40"
            style={{ animation: "af-touch-ripple 0.65s ease-out both" }}
          />
        </>
      ) : null}
    </span>
  );
}
