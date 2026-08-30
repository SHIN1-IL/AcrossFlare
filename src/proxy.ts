import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { PRIVATE_NO_STORE } from "./lib/http-cache";

const handleI18n = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  const response = handleI18n(request);

  if (request.nextUrl.pathname === "/") {
    response.headers.set("Cache-Control", PRIVATE_NO_STORE);
    response.headers.delete("CDN-Cache-Control");
  }

  return response;
}

export const config = {
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
