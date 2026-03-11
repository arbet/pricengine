import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/auth.config";

const { auth } = NextAuth(authConfig);
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/", "/api/auth", "/api/v1/pricing"];

const ROLE_ACCESS: Record<string, string[]> = {
  super_admin: ["/dashboard/admin"],
  lab_manager: [
    "/dashboard/tests",
    "/dashboard/panels",
    "/dashboard/calculator",
    "/dashboard/logs",
    "/dashboard/analytics",
  ],
  lab_employee: ["/dashboard/calculator"],
};

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const user = req.auth?.user;

  // Redirect unauthenticated users to login
  if (!user) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Dashboard index is a redirect page, allow it
  if (pathname === "/dashboard") {
    return NextResponse.next();
  }

  // Check role-based access
  const role = (user as { role: string }).role;
  const allowedPaths = ROLE_ACCESS[role] || [];
  const hasAccess = allowedPaths.some((p) => pathname.startsWith(p));

  if (!hasAccess) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
