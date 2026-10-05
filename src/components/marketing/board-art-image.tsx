"use client";

import type { CSSProperties } from "react";
import { BOARD_ART } from "@/lib/board-art";
import { cn } from "@/lib/utils";

type BoardArtImageProps = {
  /** Page-1 LCP plate — eager + high fetch priority. Below-fold must stay false. */
  priority?: boolean;
  className?: string;
  pictureClassName?: string;
  style?: CSSProperties;
  alt?: string;
};

/**
 * Shared motherboard plate with WebP (+ JPEG fallback).
 * Avoids the 4K 1.3MB JPG on first paint while keeping object-fit/mask layouts intact.
 */
export function BoardArtImage({
  priority = false,
  className,
  pictureClassName,
  style,
  alt = "",
}: BoardArtImageProps) {
  return (
    <picture className={cn("contents", pictureClassName)}>
      <source
        type="image/webp"
        srcSet={`${BOARD_ART.webp1280} 1280w, ${BOARD_ART.webp1920} 1920w`}
        sizes="100vw"
      />
      <img
        src={BOARD_ART.jpeg1920}
        alt={alt}
        width={BOARD_ART.width}
        height={BOARD_ART.height}
        draggable={false}
        decoding={priority ? "sync" : "async"}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "low"}
        className={className}
        style={style}
      />
    </picture>
  );
}
