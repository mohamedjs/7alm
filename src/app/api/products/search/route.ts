import { NextRequest, NextResponse } from "next/server";
import { productService } from "@/features/products/products.service";

/**
 * GET /api/products/search?q=...
 * Public endpoint — case-insensitive storefront product search.
 * Queries under 2 characters return an empty array.
 */
export async function GET(req: NextRequest) {
  try {
    const query = req.nextUrl.searchParams.get("q") || "";
    const results = await productService.search(query);
    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error("GET /api/products/search error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to search products" },
      { status: 500 }
    );
  }
}
