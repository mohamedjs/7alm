import { NextRequest, NextResponse } from "next/server";
import { productService } from "@/features/products/products.service";

/**
 * GET /api/products
 * Public endpoint — storefront product listing.
 *
 * Query params:
 *  - `category=<slug|uuid>` — active products in one category.
 *  - `featured=true`        — active products flagged `is_featured`.
 *  - (none)                 — every active product.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const featured = searchParams.get("featured");

    let products;
    if (featured === "true") {
      products = await productService.getFeaturedProducts();
    } else if (category) {
      products = await productService.getActiveProductsByCategory(category);
    } else {
      products = await productService.getAllActiveProducts();
    }

    return NextResponse.json({ success: true, data: products });
  } catch (error: any) {
    console.error("GET /api/products error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
