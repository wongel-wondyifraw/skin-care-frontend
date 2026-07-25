import { NextRequest, NextResponse } from "next/server";

const PROTECTED = /^\/admin(?!\/(login))(\/|$)/;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only guard /admin/* routes except /admin/login
  if (!PROTECTED.test(pathname)) return NextResponse.next();

  const token = request.cookies.get("adminToken")?.value;

  if (!token) {
    const loginUrl = new URL("/admin/login", request.url);
    // Pass the original destination so we can redirect back after login if needed
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Run on all /admin routes; skip Next.js internals and static files
  matcher: ["/admin/:path*"],
};
