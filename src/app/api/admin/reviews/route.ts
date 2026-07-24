import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, extractToken } from "@/lib/auth";
import { reviewsService } from "@/features/reviews/reviews.service";
import type { ReviewStatus } from "@/features/shared/types";

const VALID_STATUSES: ReviewStatus[] = ["pending", "approved", "rejected"];

/**
 * GET /api/admin/reviews?status=pending
 * Admin-only — moderation queue, optionally filtered by status.
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
      statusParam && VALID_STATUSES.includes(statusParam as ReviewStatus)
        ? (statusParam as ReviewStatus)
        : undefined;

    const reviews = await reviewsService.listForModeration(status);

    return NextResponse.json({ success: true, data: reviews });
  } catch (error) {
    console.error("GET /api/admin/reviews error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}
