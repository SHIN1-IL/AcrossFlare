"use client";

import dynamic from "next/dynamic";

export const HeroAtmosphereLazy = dynamic(
  () => import("@/components/marketing/hero-atmosphere").then((mod) => mod.HeroAtmosphere),
  { ssr: false }
);
