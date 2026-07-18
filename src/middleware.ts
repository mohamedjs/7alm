import { NextRequest, NextResponse } from "next/server";
import { ADMIN_TOKEN_COOKIE } from "@/lib/auth-cookie";

/**
 * Auth gate for every /admin page. Runs BEFORE any page is rendered or
 * served, so unauthenticated visitors are redirected to /admin/login without
 * the dashboard ever loading.
 *
 * The access token is validated against Supabase Auth on every request.
 * Admin-table membership is not re-checked here: the login route only sets
 * the cookie after verifying the user is in the admins table, and every data
 * API route re-runs verifyAdmin on each call.
 */

async function isValidSupabaseToken(token: string): Promise<boolean> {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const apikey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_KEY ||
    "";
  if (!url || !apikey) return false;

  try {
    const res = await fetch(`${url}/auth/v1/user`, {
      headers: {
        apikey,
        Authorization: `Bearer ${token}`,
      },
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

  const isAuthenticated = token ? await isValidSupabaseToken(token) : false;

  if (!isAuthenticated && !isLoginPage) {
    const response = NextResponse.redirect(
      new URL("/admin/login", request.url)
    );
    // Drop a stale/invalid cookie so we don't re-validate it on every hit.
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
