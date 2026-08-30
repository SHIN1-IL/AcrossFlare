import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "ko", "zh", "ja"],
  defaultLocale: "en",
  localePrefix: "always",
  // Unprefixed `/` follows Accept-Language (device language). Keep the cookie
  // off so locale-prefixed marketing HTML stays CDN-cacheable.
  localeDetection: true,
  localeCookie: false,
});

export type AppLocale = (typeof routing.locales)[number];
