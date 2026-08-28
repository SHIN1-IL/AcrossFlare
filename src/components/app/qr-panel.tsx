"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function QrPanel({
  value,
  label,
  className,
  copyImageLabel,
  copiedImageLabel,
}: {
  value: string;
  label: string;
  className?: string;
  copyImageLabel?: string;
  copiedImageLabel?: string;
}) {
  const [src, setSrc] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!value) {
      setSrc("");
      return;
    }
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

  async function copyQr() {
    try {
      if (src && typeof ClipboardItem !== "undefined") {
        const blob = await (await fetch(src)).blob();
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      } else {
        await navigator.clipboard.writeText(value);
      }
    } catch {
      await navigator.clipboard.writeText(value);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

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
      {copyImageLabel ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-[10px]"
          disabled={!value}
          onClick={() => void copyQr()}
        >
          {copied ? <Check className="text-primary" /> : <Copy />}
          {copied ? (copiedImageLabel ?? copyImageLabel) : copyImageLabel}
        </Button>
      ) : null}
    </div>
  );
}
