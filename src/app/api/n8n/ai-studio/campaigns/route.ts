import { NextRequest, NextResponse } from "next/server";
import { requireN8nAccess } from "@/lib/n8n-auth";
import { campaignsService } from "@/features/ai-studio/campaigns.service";
import type { AdCampaignInput, AdCampaignPlatform, AdCampaignStatus } from "@/features/shared/types";

const VALID_PLATFORMS: AdCampaignPlatform[] = ["meta", "facebook_instagram", "whatsapp"];
const VALID_STATUSES: AdCampaignStatus[] = ["draft", "ready", "published", "archived"];

/**
 * POST /api/n8n/ai-studio/campaigns
 * n8n-only (x-n8n-access-token) — the "Generate FB Post" Telegram marketing
 * agent's `save_campaign` tool calls this once the owner explicitly approves
 * a campaign in chat. `status` defaults to "ready"; the agent only sends
 * "published" if it already ran the Facebook/Instagram publish tools in the
 * same turn.
 */
export async function POST(req: NextRequest) {
  const authError = requireN8nAccess(req);
  if (authError) return authError;

  try {
    const body = (await req.json()) as Partial<AdCampaignInput>;

    if (!body.name?.trim() || !body.niche?.trim() || !body.objective?.trim()) {
      return NextResponse.json(
        { success: false, error: "name, niche, and objective are required" },
        { status: 400 }
      );
    }
    if (!body.headline?.trim() || !body.primary_text?.trim() || !body.cta?.trim()) {
      return NextResponse.json(
        { success: false, error: "headline, primary_text, and cta are required" },
        { status: 400 }
      );
    }
    if (body.platform && !VALID_PLATFORMS.includes(body.platform)) {
      return NextResponse.json(
        { success: false, error: `platform must be one of ${VALID_PLATFORMS.join(", ")}` },
        { status: 400 }
      );
    }
    if (body.status && !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { success: false, error: `status must be one of ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const campaign = await campaignsService.saveApprovedCampaign(body as AdCampaignInput);
    return NextResponse.json({ success: true, data: campaign });
  } catch (error) {
    console.error("POST /api/n8n/ai-studio/campaigns error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save campaign" },
      { status: 500 }
    );
  }
}
