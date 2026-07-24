import { NextResponse } from "next/server";
import { productService } from "@/features/products/products.service";
import { reviewsService } from "@/features/reviews/reviews.service";

/**
 * GET /api/products/[slug]/reviews
 * Public endpoint — returns approved reviews + the rating aggregate for
 * the product resolved by slug. No customer PII in the response.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const product = await productService.getProductBySlug(slug);
    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    const { reviews, aggregate } = await reviewsService.getProductReviews(product.id);

    return NextResponse.json({ success: true, data: { reviews, aggregate } });
  } catch (error) {
    console.error("GET /api/products/[slug]/reviews error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}
