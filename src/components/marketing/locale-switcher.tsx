"use client";

import { Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { MenuDot } from "@/components/marketing/menu-dot";
import { isCachedMarketingPath, localePath } from "@/i18n/path";
import { usePathname, useRouter } from "@/i18n/navigation";
import { type AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const LOCALE_ORDER: AppLocale[] = ["ko", "zh", "ja", "en"];

const itemClassName =
  "inline-flex w-full items-start gap-2 whitespace-nowrap px-3 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

export function LocaleSwitcher() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const openedByHover = useRef(false);
  const menuId = useId();
  const options = LOCALE_ORDER.filter((code) => code !== locale);
  const documentLoad = isCachedMarketingPath(pathname);

  function updatePlacement() {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    setDropUp(window.innerHeight - rect.bottom < 168 && rect.top > 168);
  }

  function showMenu() {
    updatePlacement();
    setOpen(true);
  }

  function hideMenu() {
    setOpen(false);
  }

  function switchLocale(code: AppLocale) {
    hideMenu();
    const params = Object.fromEntries(new URLSearchParams(window.location.search));
    startTransition(() => {
      router.replace(
        Object.keys(params).length > 0 ? { pathname, query: params } : pathname,
        { locale: code }
      );
    });
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        hideMenu();
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        hideMenu();
      }
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
        disabled={pending}
        onClick={() => {
          if (openedByHover.current) {
            return;
          }
          if (open) {
            hideMenu();
          } else {
            showMenu();
          }
        }}
        className="inline-flex items-center gap-0.5 whitespace-nowrap text-[13px] text-muted-foreground transition-colors hover:text-foreground md:gap-1 md:text-sm"
      >
        <Globe aria-hidden="true" className="hidden size-3.5 md:block" />
        {t("language")}
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
            className="min-w-[8.5rem] rounded-[10px] border border-border bg-popover py-1 shadow-lg"
          >
            {options.map((code) => (
              <li key={code} role="none">
                {documentLoad ? (
                  <a
                    href={localePath(code, pathname)}
                    hrefLang={code}
                    role="menuitem"
                    className={itemClassName}
                    onClick={(event) => {
                      hideMenu();
                      const search = window.location.search;
                      if (!search) {
                        return;
                      }
                      event.preventDefault();
                      window.location.assign(localePath(code, `${pathname}${search}`));
                    }}
                  >
                    <MenuDot />
                    {t(`locales.${code}`)}
                  </a>
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    disabled={pending}
                    className={itemClassName}
                    onClick={() => switchLocale(code)}
                  >
                    <MenuDot />
                    {t(`locales.${code}`)}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
