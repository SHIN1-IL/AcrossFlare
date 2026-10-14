"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * One-viewport story player: starts when the section enters view.
 * Advances one step per `nextStep()` (driven by a single button-press cue).
 * Stops on the last step; restarts on replay().
 */
export function useStoryAutoplay(stepCount: number) {
  const sectionRef = useRef<HTMLElement>(null);
  const visibleRef = useRef(false);
  const [runId, setRunId] = useState(0);
  const [step, setStep] = useState(0);
  const [armed, setArmed] = useState(false);
  const [finished, setFinished] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = Boolean(entry?.isIntersecting && (entry.intersectionRatio ?? 0) >= 0.4);
        if (visible && !visibleRef.current) {
          visibleRef.current = true;
          setArmed(true);
          setFinished(false);
          setStep(0);
          setRunId((n) => n + 1);
        } else if (!visible) {
          visibleRef.current = false;
        }
      },
      { threshold: [0.4, 0.55, 0.7] }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!armed) return;
    if (reduced) {
      setStep(Math.max(0, stepCount - 1));
      setFinished(true);
      return;
    }
    setStep(0);
    setFinished(false);
  }, [armed, reduced, runId, stepCount]);

  const nextStep = useCallback(() => {
    setStep((current) => {
      if (current >= stepCount - 1) {
        setFinished(true);
        return current;
      }
      return current + 1;
    });
  }, [stepCount]);

  const replay = useCallback(() => {
    setFinished(false);
    setStep(0);
    setArmed(true);
    setRunId((n) => n + 1);
  }, []);

  return {
    sectionRef,
    step,
    runId,
    armed,
    finished,
    reduced,
    animate: !reduced && armed && !finished,
    nextStep,
    replay,
  };
}
