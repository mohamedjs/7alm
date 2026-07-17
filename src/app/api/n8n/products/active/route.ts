import { NextRequest, NextResponse } from "next/server";
import { productService } from "@/features/products/products.service";
import { requireN8nAccess } from "@/lib/n8n-auth";

export async function GET(request: NextRequest) {
  const unauthorizedResponse = requireN8nAccess(request);
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const products = await productService.getActiveProductForAgent();
    if (!products || products.length === 0) {
      return NextResponse.json(
        { success: false, error: "No active products found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: products });
  } catch (error) {
    console.error("GET /api/n8n/products/active error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch active product" },
      { status: 500 }
    );
  }
}
