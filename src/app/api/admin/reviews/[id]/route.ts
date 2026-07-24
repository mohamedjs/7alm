import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, extractToken } from "@/lib/auth";
import { reviewsService } from "@/features/reviews/reviews.service";

/**
 * PATCH /api/admin/reviews/[id]
 * Admin-only — approve/reject a review. Body: `{ status: 'approved' | 'rejected' }`.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const body = await req.json();
    if (body.status !== "approved" && body.status !== "rejected") {
      return NextResponse.json(
        { success: false, error: "status must be 'approved' or 'rejected'" },
        { status: 400 }
      );
    }

    const review = await reviewsService.moderate(id, body.status);
    if (!review) {
      return NextResponse.json(
        { success: false, error: "Review not found or update failed" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: review });
  } catch (error) {
    console.error("PATCH /api/admin/reviews/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update review" },
      { status: 500 }
    );
  }
}
