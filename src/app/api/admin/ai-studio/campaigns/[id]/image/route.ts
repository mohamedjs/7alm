import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, extractToken } from "@/lib/auth";
import { campaignsService } from "@/features/ai-studio/campaigns.service";

/**
 * POST /api/admin/ai-studio/campaigns/[id]/image
 * Admin-only — generates (or refines) a campaign's visual from the dashboard,
 * so the owner isn't forced back into Telegram to change an image.
 *
 * Body: { prompt? } — omitted means "make one from this campaign's own copy";
 * supplied means "change it like this", which refines the current image.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const body = (await req.json().catch(() => ({}))) as { prompt?: string };

    const campaign = await campaignsService.generateImage(id, body.prompt);
    return NextResponse.json({ success: true, data: campaign });
  } catch (error) {
    console.error("POST /api/admin/ai-studio/campaigns/[id]/image error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate image";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
