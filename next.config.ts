import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import {
  MARKETING_CACHE_CONTROL,
  MARKETING_CACHE_SOURCES,
  MARKETING_CDN_CACHE_CONTROL,
  PRIVATE_CACHE_SOURCES,
  PRIVATE_NO_STORE,
} from "./src/lib/http-cache";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  outputFileTracingIncludes: {
    "/*": ["./messages/**/*", "./prisma/**/*"],
  },
  serverExternalPackages: ["@prisma/client", "prisma", "undici"],
  async headers() {
    return [
      {
        source: "/across-mark.svg",
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      },
      ...MARKETING_CACHE_SOURCES.map((source) => ({
        source,
        headers: [
          { key: "Cache-Control", value: MARKETING_CACHE_CONTROL },
          { key: "CDN-Cache-Control", value: MARKETING_CDN_CACHE_CONTROL },
        ],
      })),
      ...PRIVATE_CACHE_SOURCES.map((source) => ({
        source,
        headers: [{ key: "Cache-Control", value: PRIVATE_NO_STORE }],
      })),
    ];
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ["**/.git/**", "**/.next/**", "**/node_modules/**"],
      };
    }
    return config;
  },
};

export default withNextIntl(nextConfig);
