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

const fastApiOrigin =
  process.env.FASTAPI_INTERNAL_URL ?? process.env.FASTAPI_URL ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async rewrites() {
    return [
      {
        source: "/api/v1/subscription",
        destination: `${fastApiOrigin}/api/v1/subscription`,
      },
      {
        source: "/api/v1/subscription/:token",
        destination: `${fastApiOrigin}/api/v1/subscription/:token`,
      },
    ];
  },
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
          { key: "Cloudflare-CDN-Cache-Control", value: MARKETING_CDN_CACHE_CONTROL },
          { key: "Vary", value: "Accept-Encoding" },
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
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default withNextIntl(nextConfig);
