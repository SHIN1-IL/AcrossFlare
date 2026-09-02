import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { SESSION_COOKIE } from "./lib/auth-cookies";
import { PRIVATE_NO_STORE } from "./lib/http-cache";

const handleI18n = createMiddleware(routing);

const PROTECTED_PATH =
  /^\/(en|ko|zh|ja)\/(app|admin|checkout|support|dashboard)(\/|$)/;

export default function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (PROTECTED_PATH.test(pathname) && !request.cookies.get(SESSION_COOKIE)?.value) {
    const locale = pathname.split("/")[1] ?? routing.defaultLocale;
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = `/${locale}/login`;
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    const response = NextResponse.redirect(loginUrl);
    response.headers.set("Cache-Control", PRIVATE_NO_STORE);
    return response;
  }

  const response = handleI18n(request);

  if (pathname === "/") {
    response.headers.set("Cache-Control", PRIVATE_NO_STORE);
    response.headers.delete("CDN-Cache-Control");
  }

  return response;
}

export const config = {
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
