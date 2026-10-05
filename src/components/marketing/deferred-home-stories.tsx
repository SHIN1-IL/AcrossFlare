"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type RefObject,
} from "react";
import { HOME_STORY_HEIGHT } from "@/lib/board-art";
import { cn } from "@/lib/utils";

type WhyBuyProps = { live?: boolean; className?: string };
type ConsoleProps = { className?: string };

/**
 * Height-stable deferred mount for home scroll stories.
 * - Same vh + data-home-page as live stories → no snap/scroll jump
 * - Dynamic import → page-1 JS stays lean
 * - Modest rootMargin + idle fallback → blank panels stay rare without racing LCP
 */
function useDeferredStoryMount(rootMargin: string, idleTimeoutMs: number) {
  const ref = useRef<HTMLElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || ready) return;

    let cancelled = false;
    let idleHandle = 0;

    const arm = () => {
      if (!cancelled) setReady(true);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          arm();
          observer.disconnect();
        }
      },
      { rootMargin, threshold: 0.01 }
    );
    observer.observe(node);

    const requestIdle =
      window.requestIdleCallback?.bind(window) ??
      ((cb: IdleRequestCallback) =>
        window.setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 0 }), idleTimeoutMs));
    idleHandle = requestIdle(() => arm(), { timeout: idleTimeoutMs }) as number;

    return () => {
      cancelled = true;
      observer.disconnect();
      if (window.cancelIdleCallback) window.cancelIdleCallback(idleHandle);
      else window.clearTimeout(idleHandle);
    };
  }, [ready, rootMargin, idleTimeoutMs]);

  return { ref, ready };
}

function StoryShell({
  heightClass,
  className,
  shellRef,
}: {
  heightClass: string;
  className?: string;
  shellRef: RefObject<HTMLElement | null>;
}) {
  return (
    <section
      ref={shellRef}
      data-home-page
      className={cn("relative snap-start bg-[#14181e] max-md:snap-start", heightClass, className)}
      aria-hidden="true"
    >
      <div className="sticky top-0 h-dvh bg-[#14181e]" />
    </section>
  );
}

export function DeferredWhyBuyLive({ className }: { className?: string }) {
  // 35% — load as user approaches page 2, not during page-1 LCP.
  const { ref, ready } = useDeferredStoryMount("35% 0px", 2200);
  const [Comp, setComp] = useState<ComponentType<WhyBuyProps> | null>(null);

  useEffect(() => {
    if (!ready || Comp) return;
    let alive = true;
    void import("@/components/marketing/why-buy-ui-story-preview").then((mod) => {
      if (alive) setComp(() => mod.WhyBuyUiStoryPreview);
    });
    return () => {
      alive = false;
    };
  }, [ready, Comp]);

  if (!Comp) {
    return <StoryShell heightClass={HOME_STORY_HEIGHT.whyBuyLive} className={className} shellRef={ref} />;
  }

  return <Comp live className={className} />;
}

export function DeferredConsoleKaring({ className }: { className?: string }) {
  // Later story — wait until nearer; idle fallback still arms within ~3s on long dwell.
  const { ref, ready } = useDeferredStoryMount("50% 0px", 5000);
  const [Comp, setComp] = useState<ComponentType<ConsoleProps> | null>(null);

  useEffect(() => {
    if (!ready || Comp) return;
    let alive = true;
    void import("@/components/marketing/console-karing-story").then((mod) => {
      if (alive) setComp(() => mod.ConsoleKaringStory);
    });
    return () => {
      alive = false;
    };
  }, [ready, Comp]);

  if (!Comp) {
    return (
      <StoryShell heightClass={HOME_STORY_HEIGHT.consoleKaring} className={className} shellRef={ref} />
    );
  }

  return <Comp className={className} />;
}
