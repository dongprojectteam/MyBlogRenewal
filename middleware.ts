import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_COOKIE = "dopt_admin_session";
const EXCLUDED_PATHS = ["/admin", "/admin/login", "/admin/logout"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  if (EXCLUDED_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  const authed = request.cookies.get(ADMIN_COOKIE)?.value === "true";
  if (!authed) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
