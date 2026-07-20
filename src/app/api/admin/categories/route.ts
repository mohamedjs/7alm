import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { categoryService } from "@/features/categories/categories.service";

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

    const categories = await categoryService.getAllCategories();

    return NextResponse.json({ success: true, data: categories });
  } catch (error: any) {
    console.error("Categories GET Error:", error);
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

    await categoryService.validateCategory(body);

    const { data, error } = await supabase
      .from("categories")
      .insert([body])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Categories POST Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
