import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { customerService } from "@/features/customers/customers.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 }
      );
    }

    const { data: admin, error: adminError } = await supabase
      .from("admins")
      .select("id")
      .eq("id", user.id)
      .single();

    if (adminError || !admin) {
      return NextResponse.json(
        { success: false, error: "Not an admin" },
        { status: 403 }
      );
    }

    const detail = await customerService.getCustomerDetail(id);

    return NextResponse.json({ success: true, data: detail });
  } catch (error: any) {
    console.error("Customer GET Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 }
      );
    }

    const { data: admin, error: adminError } = await supabase
      .from("admins")
      .select("id")
      .eq("id", user.id)
      .single();

    if (adminError || !admin) {
      return NextResponse.json(
        { success: false, error: "Not an admin" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const allowed: Record<string, boolean> = { notes: true, email: true };
    const updates: Record<string, string> = {};
    for (const key of Object.keys(body)) {
      if (allowed[key]) updates[key] = body[key];
    }

    const customer = await customerService.updateCustomer(id, updates);

    return NextResponse.json({ success: true, data: customer });
  } catch (error: any) {
    console.error("Customer PATCH Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
