import { NextRequest, NextResponse } from "next/server";
import { ADMIN_TOKEN_COOKIE } from "@/lib/auth-cookie";

/**
 * Auth gate for every /admin page: unauthenticated visitors are redirected
 * to /admin/login before the dashboard renders. The cookie is validated by
 * the NestJS api (`GET /api/auth/session`), which also checks the admin is
 * still active — the web tier holds no secrets.
 */
const BACKEND_URL = (process.env.BACKEND_URL ?? "http://localhost:4000").replace(/\/$/, "");

async function isValidSession(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/session`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === "/admin/login";
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  const isAuthenticated = token ? await isValidSession(token) : false;

  if (!isAuthenticated && !isLoginPage) {
    const response = NextResponse.redirect(new URL("/admin/login", request.url));
    if (token) response.cookies.delete(ADMIN_TOKEN_COOKIE);
    return response;
  }
  if (isAuthenticated && isLoginPage) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
