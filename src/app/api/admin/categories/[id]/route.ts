import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { categoryService } from "@/features/categories/categories.service";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: categoryId } = await params;
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

    await categoryService.validateCategory(body, categoryId);

    const { data, error } = await supabase
      .from("categories")
      .update(body)
      .eq("id", categoryId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Category PUT Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: categoryId } = await params;
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

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", categoryId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Category DELETE Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
