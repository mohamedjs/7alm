import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, extractToken } from "@/lib/auth";
import { socialService } from "@/features/social/social.service";
import { isSocialPlatform } from "@/features/social/social.factory";

/**
 * DELETE /api/admin/connections/[platform]
 * Best-effort revoke at the provider, then clears stored tokens and marks
 * the row as revoked.
 */
export async function DELETE(
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

    await socialService.disconnect(platform);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Connections DELETE Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
