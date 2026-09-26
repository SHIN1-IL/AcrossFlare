"use client";

import { useEffect } from "react";
import { nextHomePageTop } from "@/lib/home-page-snap";

const PHONE = "(max-width: 767px)";

export function HomePageSnap() {
  useEffect(() => {
    const media = window.matchMedia(PHONE);
    let from = window.scrollY;
    let furthest = window.scrollY;
    let pending = false;
    let moved = false;
    let snapping = false;
    let releaseTimer = 0;

    const pageTops = () =>
      [...document.querySelectorAll<HTMLElement>("[data-home-page]")]
        .filter((el) => el.getClientRects().length > 0)
        .map((el) => Math.round(el.getBoundingClientRect().top + window.scrollY));

    const align = () => {
      if (!pending || snapping || !media.matches) return;
      pending = false;
      const target = nextHomePageTop(pageTops(), from, furthest, window.innerHeight);
      if (Math.abs(target - window.scrollY) <= 1) return;
      snapping = true;
      window.scrollTo({ top: target, behavior: "smooth" });
      window.setTimeout(() => {
        snapping = false;
      }, 700);
    };

    const onStart = () => {
      if (!media.matches || snapping) return;
      from = window.scrollY;
      furthest = window.scrollY;
      pending = true;
      moved = false;
    };

    const onScroll = () => {
      if (!pending) return;
      moved = true;
      const y = window.scrollY;
      if (Math.abs(y - from) > Math.abs(furthest - from)) furthest = y;
    };

    const onScrollEnd = () => {
      if (snapping) return;
      align();
    };

    const onTouchEnd = () => {
      window.clearTimeout(releaseTimer);
      if ("onscrollend" in window) {
        releaseTimer = window.setTimeout(() => {
          if (!moved) pending = false;
        }, 120);
        return;
      }
      releaseTimer = window.setTimeout(align, 180);
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("touchcancel", onTouchEnd);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scrollend", onScrollEnd);

    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("scrollend", onScrollEnd);
      window.clearTimeout(releaseTimer);
    };
  }, []);

  return null;
}
