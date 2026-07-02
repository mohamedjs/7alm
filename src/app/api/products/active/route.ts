import { NextResponse } from "next/server";
import { productService } from "@/features/products/products.service";

/**
 * GET /api/products/active
 * Public endpoint — returns the current active product for the landing page
 */
export async function GET() {
  try {
    const product = await productService.getActiveProduct();
    if (!product) {
      return NextResponse.json(
        { success: false, error: "No active product found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    console.error("GET /api/products/active error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}
