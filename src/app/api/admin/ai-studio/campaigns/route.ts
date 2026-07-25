import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, extractToken } from "@/lib/auth";
import { campaignsService } from "@/features/ai-studio/campaigns.service";
import type { AdCampaignStatus } from "@/features/shared/types";

const VALID_STATUSES: AdCampaignStatus[] = ["draft", "ready", "published", "archived"];

/**
 * GET /api/admin/ai-studio/campaigns?status=ready
 * Admin-only — lists campaigns the Telegram marketing agent has saved, for
 * the /admin/ai-studio dashboard.
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

    const statusParam = req.nextUrl.searchParams.get("status");
    const status =
      statusParam && VALID_STATUSES.includes(statusParam as AdCampaignStatus)
        ? (statusParam as AdCampaignStatus)
        : undefined;

    const campaigns = await campaignsService.list(status);
    return NextResponse.json({ success: true, data: campaigns });
  } catch (error) {
    console.error("GET /api/admin/ai-studio/campaigns error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch campaigns" },
      { status: 500 }
    );
  }
}
