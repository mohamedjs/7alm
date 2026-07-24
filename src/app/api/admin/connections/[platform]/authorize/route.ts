import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, extractToken } from "@/lib/auth";
import { socialService } from "@/features/social/social.service";
import { isSocialPlatform } from "@/features/social/social.factory";

/**
 * POST /api/admin/connections/[platform]/authorize
 * Generates a signed OAuth state, sets it as a short-lived httpOnly
 * SameSite=Lax `social_oauth_state` cookie, and returns { authUrl } for
 * the frontend to same-tab redirect to.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    const token = extractToken(req.headers.get("authorization"));
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const auth = await verifyAdmin(token);
    if (!auth.valid) {
      return NextResponse.json(
        { success: false, error: auth.error || "Unauthorized" },
        { status: 401 }
      );
    }

    const { platform } = await params;
    if (!isSocialPlatform(platform)) {
      return NextResponse.json({ success: false, error: "Invalid platform" }, { status: 400 });
    }

    const { authUrl, state } = await socialService.initiateConnect(platform, auth.userId ?? null);

    const response = NextResponse.json({ success: true, data: { authUrl } });
    response.cookies.set("social_oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 10, // 10 minutes — matches the state's own exp claim
    });
    return response;
  } catch (error: any) {
    console.error("Connections authorize Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
