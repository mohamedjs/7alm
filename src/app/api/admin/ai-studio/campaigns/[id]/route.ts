import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, extractToken } from "@/lib/auth";
import { campaignsService } from "@/features/ai-studio/campaigns.service";
import type { AdCampaignStatus } from "@/features/shared/types";

const VALID_STATUSES: AdCampaignStatus[] = ["draft", "ready", "published", "archived"];

/**
 * PATCH /api/admin/ai-studio/campaigns/[id]
 * Admin-only — marks a campaign published (after a manual WhatsApp/Instagram
 * launch) or archived, from the dashboard.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params;
    const body = (await req.json()) as { status?: AdCampaignStatus };
    if (!body.status || !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { success: false, error: `status must be one of ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const campaign = await campaignsService.updateStatus(id, body.status);
    return NextResponse.json({ success: true, data: campaign });
  } catch (error) {
    console.error("PATCH /api/admin/ai-studio/campaigns/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update campaign" },
      { status: 500 }
    );
  }
}
