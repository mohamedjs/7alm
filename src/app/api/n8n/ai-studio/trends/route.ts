import { NextRequest, NextResponse } from "next/server";
import { requireN8nAccess } from "@/lib/n8n-auth";
import { aiStudioService } from "@/features/ai-studio/ai-studio.service";
import type { TrendStatus } from "@/features/shared/types";

const VALID_STATUSES: TrendStatus[] = ["new", "summarized", "used", "archived"];

/**
 * GET /api/n8n/ai-studio/trends?status=new
 * Called by the "ai-studio-design-director-workflow" n8n workflow to fetch
 * trend context for the LLM (Trend Hunter output the Director reasons over).
 *
 * Defaults to `status=new` when no filter is given, since that's the
 * Director's normal read (trends not yet turned into an idea).
 *
 * Security: same n8n access-token mechanism as `/api/n8n/ai-studio/ideas` —
 * header `x-n8n-access-token`, validated against `N8N_API_ACCESS_TOKEN`.
 */
export async function GET(request: NextRequest) {
  const unauthorizedResponse = requireN8nAccess(request);
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const statusParam = request.nextUrl.searchParams.get("status");
    const status: TrendStatus = VALID_STATUSES.includes(statusParam as TrendStatus)
      ? (statusParam as TrendStatus)
      : "new";

    const trends = await aiStudioService.listTrends(status);
    return NextResponse.json({ success: true, data: trends });
  } catch (error) {
    console.error("GET /api/n8n/ai-studio/trends error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch trends" },
      { status: 500 }
    );
  }
}
