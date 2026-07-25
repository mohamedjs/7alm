import { NextRequest, NextResponse } from "next/server";
import { requireN8nAccess } from "@/lib/n8n-auth";
import { designIdeasService } from "@/features/ai-studio/design-ideas.service";
import type { DesignIdeaStatus } from "@/features/shared/types";

const VALID_STATUSES: DesignIdeaStatus[] = [
  "pending_review",
  "approved",
  "rejected",
  "possible_duplicate",
  "published",
];

/**
 * GET /api/n8n/ai-studio/ideas?status=pending_review
 * Called by the "ai-studio-idea-dispatcher-workflow" n8n workflow
 * (Workflow A, `Load Pending Ideas` node) to fetch design ideas that need
 * a Telegram approval card sent to the admin.
 *
 * Defaults to `status=pending_review` when no filter is given (thin
 * wrapper over `design-ideas.repository.ts`, per
 * specs/013-ai-studio/automation-plan.md §7 Step 1).
 *
 * Security: same n8n access-token mechanism as `/api/n8n/products/active`
 * — header `x-n8n-access-token`, validated against `N8N_API_ACCESS_TOKEN`
 * (see `src/lib/n8n-auth.ts`). This is the mechanism the deployed app
 * actually checks, not the literal `123456`/`x-n8n-send-secret` strings
 * hardcoded in some existing workflow JSON — see automation-plan.md §0.
 */
export async function GET(request: NextRequest) {
  const unauthorizedResponse = requireN8nAccess(request);
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const statusParam = request.nextUrl.searchParams.get("status");
    const status: DesignIdeaStatus = VALID_STATUSES.includes(statusParam as DesignIdeaStatus)
      ? (statusParam as DesignIdeaStatus)
      : "pending_review";

    const ideas = await designIdeasService.listByStatus(status);
    return NextResponse.json({ success: true, data: ideas });
  } catch (error) {
    console.error("GET /api/n8n/ai-studio/ideas error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch design ideas" },
      { status: 500 }
    );
  }
}
