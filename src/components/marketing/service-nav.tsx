"use client";

import { Layers } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { CachedMarketingLink } from "@/components/marketing/cached-marketing-link";
import { MenuDot } from "@/components/marketing/menu-dot";
import { usePathname } from "@/i18n/navigation";
import { MARKETING_SERVICES } from "@/lib/marketing-services";
import { cn } from "@/lib/utils";

export function ServiceNav({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("nav");
  const tServices = useTranslations("services");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const openedByHover = useRef(false);
  const menuId = useId();

  function updatePlacement() {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDropUp(window.innerHeight - rect.bottom < 168 && rect.top > 168);
  }

  function showMenu() {
    updatePlacement();
    setOpen(true);
  }

  function hideMenu() {
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        hideMenu();
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") hideMenu();
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="relative"
      onMouseEnter={() => {
        openedByHover.current = true;
        showMenu();
      }}
      onMouseLeave={() => {
        openedByHover.current = false;
        hideMenu();
      }}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => {
          if (openedByHover.current) return;
          if (open) hideMenu();
          else showMenu();
        }}
        className="inline-flex items-center gap-0.5 whitespace-nowrap text-[13px] text-muted-foreground transition-colors hover:text-foreground md:gap-1 md:text-sm"
      >
        <Layers aria-hidden="true" className="hidden size-3.5 md:block" />
        {t("service")}
        <svg aria-hidden="true" viewBox="0 0 10 6" className="size-2 fill-current">
          <path d="M0 0h10L5 6z" />
        </svg>
      </button>
      {open ? (
        <div
          className={cn("absolute left-0 z-50", dropUp ? "bottom-full pb-1" : "top-full pt-1")}
        >
          <ul
            id={menuId}
            role="menu"
            className="min-w-[12.5rem] rounded-[10px] border border-border bg-popover py-1 shadow-lg"
          >
            {MARKETING_SERVICES.map((service) => {
              const active = pathname === service.href;

              return (
                <li key={service.id} role="none">
                  <CachedMarketingLink
                    href={service.href}
                    role="menuitem"
                    aria-current={active ? "page" : undefined}
                    onClick={() => {
                      hideMenu();
                      onNavigate?.();
                    }}
                    className={cn(
                      "inline-flex w-full items-start gap-2 whitespace-nowrap px-3 py-1.5 text-left text-sm transition-colors",
                      active
                        ? "text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <MenuDot />
                    {tServices(`${service.id}.title`)}
                  </CachedMarketingLink>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
