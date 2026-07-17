import { NextResponse } from "next/server";
import { productService } from "@/features/products/products.service";

/**
 * GET /api/products/active
 * Public endpoint — returns the current active product for the landing page
 */
export async function GET() {
  try {
    const products = await productService.getActiveProduct();
    if (!products || products.length === 0) {
      return NextResponse.json(
        { success: false, error: "No active products found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: products });
  } catch (error) {
    console.error("GET /api/products/active error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}
