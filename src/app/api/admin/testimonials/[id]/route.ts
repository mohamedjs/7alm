import { NextResponse } from "next/server";
import { extractToken, verifyAdmin } from "@/lib/auth";
import { testimonialsService } from "@/features/testimonials/testimonials.service";

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const token = extractToken(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { valid } = await verifyAdmin(token);
    if (!valid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await props.params;
    const body = await request.json();

    const updatedTestimonial = await testimonialsService.updateTestimonial(id, body);
    return NextResponse.json(updatedTestimonial);
  } catch (error: any) {
    console.error(`PUT /api/admin/testimonials/[id] error:`, error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const token = extractToken(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { valid } = await verifyAdmin(token);
    if (!valid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await props.params;
    await testimonialsService.deleteTestimonial(id);
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error(`DELETE /api/admin/testimonials/[id] error:`, error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
