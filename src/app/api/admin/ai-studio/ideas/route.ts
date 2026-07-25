import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, extractToken } from "@/lib/auth";
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
 * GET /api/admin/ai-studio/ideas?status=pending_review
 * Admin-only — list design ideas, optionally filtered by status. Backs the
 * `/admin/ai-studio` dashboard's ideas list (FR-015).
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
    const status = VALID_STATUSES.includes(statusParam as DesignIdeaStatus)
      ? (statusParam as DesignIdeaStatus)
      : undefined;

    const ideas = await designIdeasService.listByStatus(status);
    return NextResponse.json({ success: true, data: ideas });
  } catch (error) {
    console.error("GET /api/admin/ai-studio/ideas error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch design ideas" },
      { status: 500 }
    );
  }
}
