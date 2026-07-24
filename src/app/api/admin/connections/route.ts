import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, extractToken } from "@/lib/auth";
import { socialService } from "@/features/social/social.service";

/**
 * GET /api/admin/connections
 * Returns SocialConnectionPublic[] for all 4 platforms (facebook, instagram,
 * tiktok, whatsapp). Platforms without a row report status: "disconnected".
 * Never includes tokens.
 */
export async function GET(req: NextRequest) {
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

    const connections = await socialService.listConnections();
    return NextResponse.json({ success: true, data: connections });
  } catch (error: any) {
    console.error("Connections GET Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
