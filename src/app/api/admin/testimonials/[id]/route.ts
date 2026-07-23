import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { testimonialsService } from "@/features/testimonials/testimonials.service";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: testimonialId } = await params;
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });
    }

    const { data: admin, error: adminError } = await supabase
      .from("admins")
      .select("id")
      .eq("id", user.id)
      .single();

    if (adminError || !admin) {
      return NextResponse.json({ success: false, error: "Not an admin" }, { status: 403 });
    }

    const body = await req.json();

    const data = await testimonialsService.updateTestimonial(testimonialId, body);

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Testimonial PUT Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: testimonialId } = await params;
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });
    }

    const { data: admin, error: adminError } = await supabase
      .from("admins")
      .select("id")
      .eq("id", user.id)
      .single();

    if (adminError || !admin) {
      return NextResponse.json({ success: false, error: "Not an admin" }, { status: 403 });
    }

    await testimonialsService.deleteTestimonial(testimonialId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Testimonial DELETE Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
