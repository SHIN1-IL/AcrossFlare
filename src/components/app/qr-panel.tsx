"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { cn } from "@/lib/utils";

export function QrPanel({
  value,
  label,
  className,
}: {
  value: string;
  label: string;
  className?: string;
}) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, {
      width: 192,
      margin: 1,
      color: { dark: "#090A0F", light: "#F4F4F5" },
    }).then((url) => {
      if (!cancelled) {
        setSrc(url);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [value]);

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="inline-flex rounded-[12px] border border-border bg-[#f4f4f5] p-2">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={label} width={176} height={176} className="size-44" />
        ) : (
          <div className="size-44 animate-pulse rounded-md bg-zinc-300" />
        )}
      </div>
    </div>
  );
}
