"use client";

import { LoaderCircle, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useNow } from "@/hooks/use-now";

export function RotateButton({
  lockedUntil,
  rotating,
  onRotate,
}: {
  lockedUntil: number | null;
  rotating: boolean;
  onRotate: () => void;
}) {
  const t = useTranslations("app");
  const now = useNow();
  const remaining = lockedUntil && now ? Math.max(0, Math.ceil((lockedUntil - now) / 1000)) : 0;
  const locked = rotating || remaining > 0;

  return (
    <Button
      type="button"
      disabled={locked}
      className="rounded-[10px]"
      onClick={onRotate}
    >
      {rotating ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}
      {rotating
        ? t("rotating")
        : remaining > 0
          ? t("rotateCooldown", { seconds: remaining })
          : t("rotate")}
    </Button>
  );
}
