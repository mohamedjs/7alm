import { NextResponse } from "next/server";
import { extractToken, verifyAdmin } from "@/lib/auth";
import { testimonialsService } from "@/features/testimonials/testimonials.service";

export async function GET(request: Request) {
  try {
    const token = extractToken(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { valid } = await verifyAdmin(token);
    if (!valid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const testimonials = await testimonialsService.getAllTestimonials();
    return NextResponse.json(testimonials);
  } catch (error: any) {
    console.error("GET /api/admin/testimonials error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const token = extractToken(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { valid } = await verifyAdmin(token);
    if (!valid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    if (!body.name_ar || !body.text_ar) {
      return NextResponse.json({ error: "Missing required fields (name_ar, text_ar)" }, { status: 400 });
    }

    const newTestimonial = await testimonialsService.createTestimonial({
      name_ar: body.name_ar,
      name_en: body.name_en || null,
      role_ar: body.role_ar || null,
      role_en: body.role_en || null,
      text_ar: body.text_ar,
      text_en: body.text_en || null,
      rating: body.rating || 5,
      is_active: body.is_active ?? true,
    });

    return NextResponse.json(newTestimonial, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/admin/testimonials error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
