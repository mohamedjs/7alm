import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { testimonialsService } from "@/features/testimonials/testimonials.service";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });
    }

    // Check if user is in admins table
    const { data: admin, error: adminError } = await supabase
      .from("admins")
      .select("id")
      .eq("id", user.id)
      .single();

    if (adminError || !admin) {
      return NextResponse.json({ success: false, error: "Not an admin" }, { status: 403 });
    }

    const testimonials = await testimonialsService.getAllTestimonials();

    return NextResponse.json({ success: true, data: testimonials });
  } catch (error: any) {
    console.error("Testimonials GET Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });
    }

    // Check if user is in admins table
    const { data: admin, error: adminError } = await supabase
      .from("admins")
      .select("id")
      .eq("id", user.id)
      .single();

    if (adminError || !admin) {
      return NextResponse.json({ success: false, error: "Not an admin" }, { status: 403 });
    }

    const body = await req.json();

    if (!body.name_ar || !body.text_ar) {
      return NextResponse.json(
        { success: false, error: "Missing required fields (name_ar, text_ar)" },
        { status: 400 }
      );
    }

    const data = await testimonialsService.createTestimonial({
      name_ar: body.name_ar,
      name_en: body.name_en || null,
      role_ar: body.role_ar || null,
      role_en: body.role_en || null,
      text_ar: body.text_ar,
      text_en: body.text_en || null,
      rating: body.rating || 5,
      is_active: body.is_active ?? true,
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Testimonials POST Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
