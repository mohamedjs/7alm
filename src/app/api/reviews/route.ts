import { NextRequest, NextResponse } from "next/server";
import { reviewsService } from "@/features/reviews/reviews.service";
import type { SubmitReviewInput } from "@/features/shared/types";

/**
 * POST /api/reviews
 * Public endpoint — token-gated. Body: `{ token, rating, title?, body? }`.
 * The token (issued via the post-delivery WhatsApp link) is what
 * authorizes the submission as a verified buyer; no customerId is ever
 * trusted directly from the client.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<SubmitReviewInput>;

    if (!body.token || typeof body.token !== "string") {
      return NextResponse.json(
        { success: false, error: "A review token is required" },
        { status: 400 }
      );
    }
    if (typeof body.rating !== "number") {
      return NextResponse.json(
        { success: false, error: "A rating is required" },
        { status: 400 }
      );
    }

    const result = await reviewsService.submitReview({
      token: body.token,
      rating: body.rating,
      title: typeof body.title === "string" ? body.title : undefined,
      body: typeof body.body === "string" ? body.body : undefined,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/reviews error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to submit review" },
      { status: 500 }
    );
  }
}
