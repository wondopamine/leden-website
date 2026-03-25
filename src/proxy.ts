import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const intlMiddleware = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin routes: skip i18n
  if (pathname.startsWith("/admin")) {
    // Login page is always accessible
    if (pathname === "/admin/login") {
      return NextResponse.next();
    }
    // Check for Supabase auth cookie presence
    const hasAuthCookie = request.cookies
      .getAll()
      .some((c) => c.name.startsWith("sb-"));
    if (!hasAuthCookie) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return NextResponse.next();
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: "/((?!api|trpc|studio|_next|_vercel|.*\\..*).*)",
};
