import { NextRequest, NextResponse } from "next/server";
import { categoryService } from "@/features/categories/categories.service";

export async function GET(req: NextRequest) {
  try {
    const categories = await categoryService.getActiveCategories();

    return NextResponse.json({ success: true, data: categories });
  } catch (error: any) {
    console.error("Categories Public GET Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
