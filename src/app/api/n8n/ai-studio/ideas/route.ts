import { NextRequest, NextResponse } from "next/server";
import { requireN8nAccess } from "@/lib/n8n-auth";
import { designIdeasService } from "@/features/ai-studio/design-ideas.service";
import { aiStudioService } from "@/features/ai-studio/ai-studio.service";
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

/**
 * POST /api/n8n/ai-studio/ideas
 * Sink for the "ai-studio-design-director-workflow" LLM agent. The Director
 * returns `title` / `description` / `concept` only (never a fingerprint —
 * the server computes and dedups `concept_fingerprint` server-side, per
 * specs/013-ai-studio/automation-plan.md §1's server-authoritative rule).
 *
 * On success, also marks every trend in `source_trend_ids` as `used`
 * (`aiStudioService.markTrendsUsed`) so the hourly Director does not re-read
 * the same trends and dedup every idea into silence — this is what makes
 * `GET /api/n8n/ai-studio/trends?status=new` shrink over time.
 *
 * Expected body: { title: string, description: string, concept: string, source_trend_ids?: string[] }
 * Response: { success: true, data: DesignIdea, isDuplicate: boolean }
 *
 * Security: same n8n access-token mechanism as the GET above.
 */
export async function POST(request: NextRequest) {
  const unauthorizedResponse = requireN8nAccess(request);
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const body = await request.json();
    const title: string | undefined = body?.title;
    const description: string | undefined = body?.description;
    const concept: string | undefined = body?.concept;
    const sourceTrendIds: string[] = Array.isArray(body?.source_trend_ids)
      ? body.source_trend_ids
      : [];

    if (!title || !description || !concept) {
      return NextResponse.json(
        { success: false, error: "title, description, and concept are required" },
        { status: 400 }
      );
    }

    const { idea, isDuplicate } = await designIdeasService.createIdea({
      title,
      description,
      concept,
      sourceTrendIds,
    });

    // Mark used on BOTH paths: a duplicate result still means these trends
    // were consumed (that's why the concept collided) — leaving them `new`
    // makes the hourly Director re-read them forever and dedup every idea
    // into silence.
    if (sourceTrendIds.length > 0) {
      await aiStudioService.markTrendsUsed(sourceTrendIds);
    }

    return NextResponse.json({ success: true, data: idea, isDuplicate });
  } catch (error) {
    console.error("POST /api/n8n/ai-studio/ideas error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create design idea" },
      { status: 500 }
    );
  }
}
