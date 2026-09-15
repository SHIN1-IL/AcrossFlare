import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { isProtectedPath, localeFromPathname, localePath } from "./i18n/path";
import { SESSION_COOKIE } from "./lib/auth-cookies";
import { PRIVATE_NO_STORE } from "./lib/http-cache";

const handleI18n = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isProtectedPath(pathname) && !request.cookies.get(SESSION_COOKIE)?.value) {
    const locale = localeFromPathname(pathname);
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = localePath(locale, "/login");
    loginUrl.search = "";
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    const response = NextResponse.redirect(loginUrl);
    response.headers.set("Cache-Control", PRIVATE_NO_STORE);
    return response;
  }

  return handleI18n(request);
}

export const config = {
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
