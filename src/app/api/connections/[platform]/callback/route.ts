import { NextRequest, NextResponse } from "next/server";
import { socialService } from "@/features/social/social.service";
import { isSocialPlatform } from "@/features/social/social.factory";

/** Env is read lazily — inside this function, never at module import. */
function getRedirectBase(): string {
  return process.env.SOCIAL_OAUTH_REDIRECT_BASE || "http://localhost:3000";
}

function redirectWithCleanup(target: string): NextResponse {
  // Explicit 302 per spec §7.3 (NextResponse.redirect defaults to 307).
  const response = NextResponse.redirect(target, 302);
  response.cookies.delete("social_oauth_state");
  return response;
}

/**
 * GET /api/connections/[platform]/callback
 * PUBLIC (OAuth redirect target — no admin auth). Verifies the
 * `social_oauth_state` cookie against the `state` query param, exchanges
 * the code, stores the encrypted connection, then 302-redirects back to
 * the admin connections page with `?connected=` or `?error=`.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;

  if (!isSocialPlatform(platform)) {
    return redirectWithCleanup(`${getRedirectBase()}/admin/connections?error=invalid_platform`);
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const cookieState = req.cookies.get("social_oauth_state")?.value;

  if (!code || !state) {
    return redirectWithCleanup(
      `${getRedirectBase()}/admin/connections?error=missing_code_or_state`
    );
  }

  if (!cookieState || cookieState !== state) {
    return redirectWithCleanup(`${getRedirectBase()}/admin/connections?error=invalid_state`);
  }

  try {
    await socialService.handleCallback(platform, code, state);
    return redirectWithCleanup(`${getRedirectBase()}/admin/connections?connected=${platform}`);
  } catch (error: any) {
    console.error(`Connections callback error (${platform}):`, error);
    const message = encodeURIComponent(error.message || "connect_failed");
    return redirectWithCleanup(`${getRedirectBase()}/admin/connections?error=${message}`);
  }
}
